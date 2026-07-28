-- ============================================================
-- 已預定商品：products.is_private_custom
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_private_custom BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_private_custom IS '是否為已預定商品（非預訂者勿下單）';

CREATE INDEX IF NOT EXISTS idx_products_private_custom
  ON products (is_private_custom)
  WHERE is_private_custom = true AND deleted_at IS NULL;
