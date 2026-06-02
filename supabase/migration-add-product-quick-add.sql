-- ============================================================
-- 購物車快捷加購：products.is_quick_add
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_quick_add BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_quick_add IS '推薦加購：顯示於購物車快捷推薦區';

CREATE INDEX IF NOT EXISTS idx_products_quick_add
  ON products (is_quick_add)
  WHERE is_quick_add = true AND deleted_at IS NULL;
