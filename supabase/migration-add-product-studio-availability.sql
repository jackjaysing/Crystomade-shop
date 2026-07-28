-- ============================================================
-- 實體工作室同步販售：products.is_studio_available
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_studio_available BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_studio_available IS '是否同步於實體工作室販售中';

CREATE INDEX IF NOT EXISTS idx_products_studio_available
  ON products (is_studio_available)
  WHERE is_studio_available = true AND deleted_at IS NULL;
