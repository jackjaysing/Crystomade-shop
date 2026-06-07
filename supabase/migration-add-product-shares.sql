-- ============================================================
-- 商品分享次數：每日彙總 · 後台顯示各商品當日與總計
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS product_share_daily (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  share_date DATE NOT NULL,
  share_count INTEGER NOT NULL DEFAULT 0 CHECK (share_count >= 0),
  PRIMARY KEY (product_id, share_date)
);

COMMENT ON TABLE product_share_daily IS '各商品每日分享次數（台北時區日期）';

CREATE INDEX IF NOT EXISTS idx_product_share_daily_date
  ON product_share_daily (share_date);

ALTER TABLE product_share_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_share_daily_no_direct_access" ON product_share_daily;

CREATE POLICY "product_share_daily_no_direct_access"
  ON product_share_daily
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 記錄一次商品分享（前台分享按鈕成功時呼叫）
CREATE OR REPLACE FUNCTION increment_product_share(p_product_id UUID)
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

  INSERT INTO product_share_daily (product_id, share_date, share_count)
  VALUES (p_product_id, v_today, 1)
  ON CONFLICT (product_id, share_date)
  DO UPDATE SET share_count = product_share_daily.share_count + 1;
END;
$$;

-- 後台：各商品當日與總分享次數
CREATE OR REPLACE FUNCTION get_product_share_stats()
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
      (SELECT psd.share_count::BIGINT
       FROM product_share_daily psd
       WHERE psd.product_id = p.id
         AND psd.share_date = (NOW() AT TIME ZONE 'Asia/Taipei')::date),
      0
    ) AS today_count,
    COALESCE(
      (SELECT SUM(psd.share_count)::BIGINT
       FROM product_share_daily psd
       WHERE psd.product_id = p.id),
      0
    ) AS total_count
  FROM products p
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION increment_product_share(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_share_stats() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
