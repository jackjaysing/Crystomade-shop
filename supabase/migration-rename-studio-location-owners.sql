-- ============================================================
-- 分潤歸屬人選：羽薇／Ken／Johnman
-- 若已執行舊版（士林工作室／板橋工作室），請再跑這支
-- ============================================================

COMMENT ON COLUMN products.studio_location IS '分潤歸屬（羽薇／Ken／Johnman），null 表示未指定';

-- 舊值無法對應新名單，先清空再換約束
UPDATE products
SET studio_location = NULL
WHERE studio_location IS NOT NULL
  AND studio_location NOT IN ('羽薇', 'Ken', 'Johnman');

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_studio_location_check;

ALTER TABLE products
  ADD CONSTRAINT products_studio_location_check
  CHECK (studio_location IS NULL OR studio_location IN ('羽薇', 'Ken', 'Johnman'));
