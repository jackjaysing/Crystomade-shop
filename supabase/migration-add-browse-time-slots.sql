-- ============================================================
-- 瀏覽時段統計：星期幾 × 小時（台北時區）· 後台熱力圖
-- Supabase Dashboard → SQL Editor 執行
-- （需已執行 migration-add-page-views.sql）
-- ============================================================

CREATE TABLE IF NOT EXISTS page_view_time_slots (
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  hour_of_day SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  PRIMARY KEY (day_of_week, hour_of_day)
);

COMMENT ON TABLE page_view_time_slots IS '瀏覽時段彙總（ISO 週一至週日 · 台北時區小時）';

ALTER TABLE page_view_time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_view_time_slots_no_direct_access" ON page_view_time_slots;

CREATE POLICY "page_view_time_slots_no_direct_access"
  ON page_view_time_slots
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 記錄一次瀏覽（含每日總計與時段桶）
CREATE OR REPLACE FUNCTION increment_page_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tw TIMESTAMP := NOW() AT TIME ZONE 'Asia/Taipei';
  v_today DATE := v_tw::date;
  v_dow SMALLINT := EXTRACT(ISODOW FROM v_tw)::SMALLINT;
  v_hour SMALLINT := EXTRACT(HOUR FROM v_tw)::SMALLINT;
BEGIN
  INSERT INTO page_view_daily (view_date, view_count)
  VALUES (v_today, 1)
  ON CONFLICT (view_date)
  DO UPDATE SET view_count = page_view_daily.view_count + 1;

  INSERT INTO page_view_time_slots (day_of_week, hour_of_day, view_count)
  VALUES (v_dow, v_hour, 1)
  ON CONFLICT (day_of_week, hour_of_day)
  DO UPDATE SET view_count = page_view_time_slots.view_count + 1;
END;
$$;

-- 後台：各時段瀏覽次數（週一=1 … 週日=7，小時 0–23）
CREATE OR REPLACE FUNCTION get_page_view_time_slot_stats()
RETURNS TABLE(
  day_of_week SMALLINT,
  hour_of_day SMALLINT,
  view_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    day_of_week,
    hour_of_day,
    view_count::BIGINT
  FROM page_view_time_slots
  ORDER BY day_of_week, hour_of_day;
$$;

-- 商品瀏覽排行：依總次數排序
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
  ORDER BY total_count DESC, today_count DESC, p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION increment_page_view() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_page_view_time_slot_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_view_stats() TO anon, authenticated;

-- 讓 Supabase API 立即辨識新函式（避免 schema cache 找不到 RPC）
NOTIFY pgrst, 'reload schema';
