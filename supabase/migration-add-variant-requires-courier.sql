-- ============================================================
-- 規格級「須走宅配」：各規格可獨立勾選
--（無規格商品仍用 products.requires_courier）
-- Supabase SQL Editor 執行
-- ============================================================

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS requires_courier BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN product_variants.requires_courier IS
  '此規格不可超商取件，須走宅配；加入購物車時以此為準';

CREATE INDEX IF NOT EXISTS idx_product_variants_requires_courier
  ON product_variants (requires_courier)
  WHERE requires_courier = true;
