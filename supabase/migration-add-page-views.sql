-- ============================================================
-- 瀏覽次數：每日彙總 · 後台顯示當日與總計
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS page_view_daily (
  view_date DATE NOT NULL PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0)
);

COMMENT ON TABLE page_view_daily IS '每日瀏覽次數彙總（台北時區日期）';

ALTER TABLE page_view_daily ENABLE ROW LEVEL SECURITY;

-- 僅透過 RPC 讀寫，禁止客戶端直接存取
CREATE POLICY "page_view_daily_no_direct_access"
  ON page_view_daily
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 記錄一次瀏覽（前台路由切換時呼叫，不含 /admin）
CREATE OR REPLACE FUNCTION increment_page_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Taipei')::date;
BEGIN
  INSERT INTO page_view_daily (view_date, view_count)
  VALUES (v_today, 1)
  ON CONFLICT (view_date)
  DO UPDATE SET view_count = page_view_daily.view_count + 1;
END;
$$;

-- 後台：當日與總瀏覽次數
CREATE OR REPLACE FUNCTION get_page_view_stats()
RETURNS TABLE(today_count BIGINT, total_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE(
      (SELECT view_count::BIGINT FROM page_view_daily
       WHERE view_date = (NOW() AT TIME ZONE 'Asia/Taipei')::date),
      0
    ) AS today_count,
    COALESCE((SELECT SUM(view_count)::BIGINT FROM page_view_daily), 0) AS total_count;
$$;

GRANT EXECUTE ON FUNCTION increment_page_view() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_page_view_stats() TO anon, authenticated;
