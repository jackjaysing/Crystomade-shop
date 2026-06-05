-- ============================================================
-- 手串款式新增：兒童款（若已執行過 migration-add-bracelet-style.sql）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_bracelet_style_check;

ALTER TABLE products
  ADD CONSTRAINT products_bracelet_style_check
  CHECK (bracelet_style IS NULL OR bracelet_style IN ('通用', '男款', '女款', '兒童款'));

COMMENT ON COLUMN products.bracelet_style IS '手串款式：通用、男款、女款、兒童款；非手串為 NULL';
