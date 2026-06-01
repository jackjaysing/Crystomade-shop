-- ============================================================
-- 公告橫幅：前台輪播 · 後台上傳管理
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS announcement_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE announcement_banners IS '前台公告橫幅圖片';
COMMENT ON COLUMN announcement_banners.link_url IS '點擊橫幅跳轉網址（選填）';
COMMENT ON COLUMN announcement_banners.sort_order IS '排序：數字越小越前面';

CREATE INDEX IF NOT EXISTS idx_announcement_banners_sort
  ON announcement_banners (is_active, sort_order, created_at DESC);

ALTER TABLE announcement_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公開讀取公告橫幅" ON announcement_banners;
CREATE POLICY "公開讀取公告橫幅"
  ON announcement_banners FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "新增公告橫幅" ON announcement_banners;
CREATE POLICY "新增公告橫幅"
  ON announcement_banners FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "更新公告橫幅" ON announcement_banners;
CREATE POLICY "更新公告橫幅"
  ON announcement_banners FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "刪除公告橫幅" ON announcement_banners;
CREATE POLICY "刪除公告橫幅"
  ON announcement_banners FOR DELETE
  USING (true);
