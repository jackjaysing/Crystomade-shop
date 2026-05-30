-- 既有專案追加「品類」欄位（在 SQL Editor 執行一次即可）
-- 適用於已建立 products 表但尚無 category 欄位的情況

DO $$ BEGIN
  CREATE TYPE product_category AS ENUM ('手串', '擺件', '礦石');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category product_category NOT NULL DEFAULT '礦石';

COMMENT ON COLUMN products.category IS '品類：手串、擺件、礦石';

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- 可選：依名稱關鍵字更新舊資料品類
UPDATE products SET category = '手串' WHERE category = '礦石' AND name LIKE '%手串%';
UPDATE products SET category = '擺件' WHERE category = '礦石' AND (name LIKE '%擺%' OR name LIKE '%簇%');
