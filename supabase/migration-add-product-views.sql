-- ============================================================
-- 商品瀏覽次數：每日彙總 · 後台顯示各商品當日與總計
-- Supabase Dashboard → SQL Editor 執行
-- （需已執行 migration-add-page-views.sql 或獨立執行本檔）
-- ============================================================

CREATE TABLE IF NOT EXISTS product_view_daily (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  PRIMARY KEY (product_id, view_date)
);

COMMENT ON TABLE product_view_daily IS '各商品每日瀏覽次數（台北時區日期）';

CREATE INDEX IF NOT EXISTS idx_product_view_daily_date
  ON product_view_daily (view_date);

ALTER TABLE product_view_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_view_daily_no_direct_access" ON product_view_daily;

CREATE POLICY "product_view_daily_no_direct_access"
  ON product_view_daily
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 記錄一次商品瀏覽（開啟商品詳情時呼叫）
CREATE OR REPLACE FUNCTION increment_product_view(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Taipei')::date;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE id = p_product_id AND deleted_at IS NULL
  ) THEN
    RETURN;
  END IF;

  INSERT INTO product_view_daily (product_id, view_date, view_count)
  VALUES (p_product_id, v_today, 1)
  ON CONFLICT (product_id, view_date)
  DO UPDATE SET view_count = product_view_daily.view_count + 1;
END;
$$;

-- 後台：各商品當日與總瀏覽次數
CREATE OR REPLACE FUNCTION get_product_view_stats()
RETURNS TABLE(
  product_id UUID,
  today_count BIGINT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id AS product_id,
    COALESCE(
      (SELECT pvd.view_count::BIGINT
       FROM product_view_daily pvd
       WHERE pvd.product_id = p.id
         AND pvd.view_date = (NOW() AT TIME ZONE 'Asia/Taipei')::date),
      0
    ) AS today_count,
    COALESCE(
      (SELECT SUM(pvd.view_count)::BIGINT
       FROM product_view_daily pvd
       WHERE pvd.product_id = p.id),
      0
    ) AS total_count
  FROM products p
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION increment_product_view(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_view_stats() TO anon, authenticated;
