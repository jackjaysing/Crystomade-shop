-- ============================================================
-- 修復：orders 缺少 product_name / product_image_url
-- 若下單出現 column "product_name" does not exist，執行此檔
-- Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS product_image_url TEXT;

UPDATE orders o
SET
  product_name = p.name,
  product_image_url = p.image_url
FROM products p
WHERE o.product_id = p.id
  AND (o.product_name IS NULL OR o.product_name = '');

COMMENT ON COLUMN orders.product_name IS '下單當下商品名稱快照（商品刪除後仍保留）';
COMMENT ON COLUMN orders.product_image_url IS '下單當下商品封面快照';

-- 若尚未執行過，一併允許出貨後刪除商品（product_id 可為 NULL）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_id_fkey;

ALTER TABLE orders
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE orders
  ADD CONSTRAINT orders_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
