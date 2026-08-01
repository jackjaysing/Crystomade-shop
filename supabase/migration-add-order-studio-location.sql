-- ============================================================
-- 訂單列分潤歸屬：orders.studio_location
-- 可覆寫商品預設；null 表示沿用商品分潤歸屬
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS studio_location TEXT;

COMMENT ON COLUMN orders.studio_location IS '此訂單品項分潤歸屬（羽薇／Ken／Johnman）；null 表示沿用商品預設';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_studio_location_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_studio_location_check
      CHECK (studio_location IS NULL OR studio_location IN ('羽薇', 'Ken', 'Johnman'));
  END IF;
END $$;

-- 既有訂單：若尚未指定，先帶入商品預設分潤歸屬
UPDATE orders o
SET studio_location = p.studio_location
FROM products p
WHERE o.product_id = p.id
  AND o.studio_location IS NULL
  AND p.studio_location IS NOT NULL
  AND p.studio_location IN ('羽薇', 'Ken', 'Johnman');

CREATE INDEX IF NOT EXISTS idx_orders_studio_location
  ON orders (studio_location)
  WHERE studio_location IS NOT NULL AND deleted_at IS NULL;
