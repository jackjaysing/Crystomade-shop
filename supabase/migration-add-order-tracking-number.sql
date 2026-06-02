-- ============================================================
-- 訂單寄件單號（後台填寫 · 出貨通知罐頭訊息使用）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

COMMENT ON COLUMN orders.tracking_number IS '物流寄件單號（同一結帳批次共用）';
