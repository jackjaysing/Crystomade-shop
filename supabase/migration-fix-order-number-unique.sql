-- ============================================================
-- 修正：同一 checkout_id 多筆訂單共用 order_number
-- 舊版 idx_orders_order_number 全表唯一會導致第二筆 INSERT 失敗
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

DROP INDEX IF EXISTS idx_orders_order_number;

-- 僅「非購物車併單」的單筆訂單維持 order_number 唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number_singleton
  ON orders (order_number)
  WHERE order_number IS NOT NULL AND checkout_id IS NULL;

COMMENT ON INDEX idx_orders_order_number_singleton IS
  '無 checkout_id 的訂單編號唯一；有 checkout_id 者同批次可共用同一編號';
