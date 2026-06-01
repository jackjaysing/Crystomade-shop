-- ============================================================
-- 商品排序 products.sort_order（數字越小越前面，熱門另由 is_hot 置頂）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN products.sort_order IS '商品排序：數字越小越前面（熱門商品 is_hot 仍置頂）';

CREATE INDEX IF NOT EXISTS idx_products_sort
  ON products (is_hot DESC, sort_order ASC, created_at DESC);

-- 既有商品依上架時間新到舊給序號
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM products
)
UPDATE products p
SET sort_order = numbered.rn
FROM numbered
WHERE p.id = numbered.id;
