-- 商品折扣（折）：8 表示 8 折，NULL 表示無折扣；price 為原價
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_zhe NUMERIC(4, 1) NULL;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_discount_zhe_check;

ALTER TABLE products
  ADD CONSTRAINT products_discount_zhe_check
  CHECK (discount_zhe IS NULL OR (discount_zhe > 0 AND discount_zhe < 10));

COMMENT ON COLUMN products.discount_zhe IS '折扣（折），如 8 表示 8 折；NULL 表示無折扣';
COMMENT ON COLUMN products.price IS '原價（NT$）；有折扣時前台特價 = 原價 × 折扣 ÷ 10';
