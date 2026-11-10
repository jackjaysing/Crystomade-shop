-- ============================================================
-- 商品「須走宅配（不可超商）」標記
-- 結帳時若購物車含此類商品，改收宅配地址（cvs_brand = 宅配）
-- Supabase SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS requires_courier BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.requires_courier IS
  '勾選後不可超商取件，結帳改走宅配並填寫收件地址';

CREATE INDEX IF NOT EXISTS idx_products_requires_courier
  ON products (requires_courier)
  WHERE requires_courier = true AND deleted_at IS NULL;
