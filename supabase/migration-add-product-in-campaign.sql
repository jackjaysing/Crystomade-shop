-- ============================================================
-- 商品「顯示於活動」標記（前台第一區活動專區；不改動 product_category）
-- Supabase SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS in_campaign BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.in_campaign IS
  '勾選後同步出現在前台「活動」專區（仍保留原品類）';

CREATE INDEX IF NOT EXISTS idx_products_in_campaign
  ON products (in_campaign)
  WHERE in_campaign = true AND deleted_at IS NULL;
