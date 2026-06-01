-- ============================================================
-- 訂單付款狀態：後台標記已付款 / 未付款
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.is_paid IS '後台標記：買家是否已付款';

CREATE INDEX IF NOT EXISTS idx_orders_is_paid ON orders (is_paid);
