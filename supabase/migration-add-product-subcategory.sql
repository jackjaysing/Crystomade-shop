-- 擺件／礦石細項分類
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

COMMENT ON COLUMN products.subcategory IS '擺件：龍龜、貔貅、原礦、其他；礦石：原石、晶鎮、晶球、晶洞、碎石；手串為 NULL';

UPDATE products
SET subcategory = '其他'
WHERE category = '擺件' AND (subcategory IS NULL OR subcategory = '');

UPDATE products
SET subcategory = '原石'
WHERE category = '礦石' AND (subcategory IS NULL OR subcategory = '');

UPDATE products
SET subcategory = NULL
WHERE category = '手串';

CREATE INDEX IF NOT EXISTS idx_products_subcategory
  ON products (subcategory)
  WHERE subcategory IS NOT NULL;
