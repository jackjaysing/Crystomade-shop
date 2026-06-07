-- 商品五行屬性（金木水火土，可多選）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS five_elements TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN products.five_elements IS '五行屬性：金、木、水、火、土（可多選）';
