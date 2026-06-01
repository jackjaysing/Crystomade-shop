-- ============================================================
-- 公告橫幅名稱 announcement_banners.name
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE announcement_banners
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN announcement_banners.name IS '橫幅名稱（後台識別 · 前台無障礙替代文字）';
