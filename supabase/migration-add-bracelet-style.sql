-- ============================================================
-- 手串款式：通用、男款、女款、兒童款（僅 category = 手串 時使用）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS bracelet_style TEXT
  CHECK (bracelet_style IS NULL OR bracelet_style IN ('通用', '男款', '女款', '兒童款'));

COMMENT ON COLUMN products.bracelet_style IS '手串款式：通用、男款、女款、兒童款；非手串為 NULL';

UPDATE products
SET bracelet_style = '通用'
WHERE category = '手串' AND bracelet_style IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_bracelet_style
  ON products (bracelet_style)
  WHERE category = '手串';
