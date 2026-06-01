-- ============================================================
-- 商品軟刪除：deleted_at（已刪除物品可查看並重新上架）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products (deleted_at);

COMMENT ON COLUMN products.deleted_at IS '軟刪除時間；NULL 表示上架中';
