-- ============================================================
-- 熱門商品 products.is_hot
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_hot BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_hot IS '後台標記熱門商品，前台顯示熱門標示';

CREATE INDEX IF NOT EXISTS idx_products_is_hot
  ON products (is_hot)
  WHERE is_hot = true;
