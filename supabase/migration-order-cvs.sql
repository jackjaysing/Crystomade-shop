-- 訂單改為超商取件欄位（既有專案執行一次）
-- Supabase SQL Editor → Run

ALTER TABLE orders ADD COLUMN IF NOT EXISTS line_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cvs_brand TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cvs_store TEXT;

-- 舊資料：若有 address 欄位，搬到 cvs_store
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address'
  ) THEN
    UPDATE orders
    SET cvs_store = address
    WHERE (cvs_store IS NULL OR cvs_store = '') AND address IS NOT NULL AND address <> '';
  END IF;
END $$;

UPDATE orders SET cvs_brand = '7-11' WHERE cvs_brand IS NULL OR cvs_brand = '';

UPDATE orders SET cvs_store = '（待補門市）' WHERE cvs_store IS NULL OR cvs_store = '';

ALTER TABLE orders ALTER COLUMN cvs_brand SET NOT NULL;
ALTER TABLE orders ALTER COLUMN cvs_store SET NOT NULL;

-- 移除舊的 address 欄位（若存在）
ALTER TABLE orders DROP COLUMN IF EXISTS address;

-- 超商限制
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_cvs_brand_check;
ALTER TABLE orders ADD CONSTRAINT orders_cvs_brand_check
  CHECK (cvs_brand IN ('7-11', '全家'));

COMMENT ON COLUMN orders.line_name IS 'Line 顯示名稱（選填）';
COMMENT ON COLUMN orders.cvs_brand IS '收件超商：7-11 或 全家';
COMMENT ON COLUMN orders.cvs_store IS '收件門市名稱或店號';
