-- ============================================================
-- 晶刻 Crystomade · Supabase 資料庫結構
-- 於 Supabase Dashboard → SQL Editor 執行此腳本（可重複執行）
-- ============================================================

-- 商品狀態與訂單狀態列舉（已存在則略過）
DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('available', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'shipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE product_category AS ENUM ('手串', '擺件', '礦石');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- Products 商品表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT '礦石',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT NOT NULL,
  gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  status product_status NOT NULL DEFAULT 'available',
  stock INTEGER NOT NULL DEFAULT 1 CHECK (stock >= 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE products IS '水晶商品：一物一圖';
COMMENT ON COLUMN products.category IS '品類：手串、擺件、礦石';
COMMENT ON COLUMN products.gallery_urls IS '詳情頁額外圖片（不含封面 image_url）';
COMMENT ON COLUMN products.tags IS '功效標籤，如 招財、人緣';
COMMENT ON COLUMN products.status IS 'available=上架中, sold=已售出';
COMMENT ON COLUMN products.stock IS '庫存件數，下單成功扣 1，0 為售罄';

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- ------------------------------------------------------------
-- Orders 訂單表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  buyer_name TEXT NOT NULL,
  line_name TEXT,
  phone TEXT NOT NULL,
  cvs_brand TEXT NOT NULL CHECK (cvs_brand IN ('7-11', '全家')),
  cvs_store TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  status order_status NOT NULL DEFAULT 'pending'
);

COMMENT ON TABLE orders IS '買家訂單';
COMMENT ON COLUMN orders.line_name IS 'Line 顯示名稱（選填）';
COMMENT ON COLUMN orders.cvs_brand IS '收件超商：7-11 或 全家';
COMMENT ON COLUMN orders.cvs_store IS '收件門市名稱或店號';
COMMENT ON COLUMN orders.status IS 'pending=未處理, shipped=已出貨';

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- ------------------------------------------------------------
-- Storage：商品圖片儲存桶
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 政策（先刪除同名再建立，避免重複執行報錯）
DROP POLICY IF EXISTS "公開讀取商品圖片" ON storage.objects;
CREATE POLICY "公開讀取商品圖片"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "允許上傳商品圖片" ON storage.objects;
CREATE POLICY "允許上傳商品圖片"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- ------------------------------------------------------------
-- Row Level Security（RLS）
-- ------------------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公開讀取商品" ON products;
CREATE POLICY "公開讀取商品"
ON products FOR SELECT
USING (true);

DROP POLICY IF EXISTS "公開建立訂單" ON orders;
CREATE POLICY "公開建立訂單"
ON orders FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "讀取訂單" ON orders;
CREATE POLICY "讀取訂單"
ON orders FOR SELECT
USING (true);

DROP POLICY IF EXISTS "更新商品" ON products;
CREATE POLICY "更新商品"
ON products FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "新增商品" ON products;
CREATE POLICY "新增商品"
ON products FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "更新訂單" ON orders;
CREATE POLICY "更新訂單"
ON orders FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "刪除商品" ON products;
CREATE POLICY "刪除商品"
ON products FOR DELETE
USING (true);

-- ------------------------------------------------------------
-- 範例資料（僅在尚無商品時插入）
-- ------------------------------------------------------------
INSERT INTO products (name, category, price, tags, image_url, gallery_urls, status, description)
SELECT * FROM (VALUES
  (
    '金鈦晶簇 · 晨曦',
    '擺件'::product_category,
    12800::numeric,
    ARRAY['財運', '事業']::text[],
    'https://images.unsplash.com/photo-1515568709171-3386a825eaeb?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80',
      'https://images.unsplash.com/photo-1611085586311-8d3f1f6fcf2f?w=800&q=80'
    ]::text[],
    'available'::product_status,
    '天然金鈦晶，板狀金髮絲清晰，能量集中於事業與財運。一物一圖，獨一無二。'
  ),
  (
    '粉晶心動 · 柔光',
    '手串'::product_category,
    3600::numeric,
    ARRAY['人緣', '情感']::text[],
    'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80',
    ARRAY[]::text[],
    'available'::product_status,
    '馬達加斯加粉晶，通透果凍感，招桃花、增人緣。'
  ),
  (
    '紫鋰輝雙尖 · 月夜',
    '礦石'::product_category,
    8800::numeric,
    ARRAY['舒緩', '靈性']::text[],
    'https://images.unsplash.com/photo-1611085586311-8d3f1f6fcf2f?w=800&q=80',
    ARRAY[]::text[],
    'sold'::product_status,
    '淡紫鋰輝石雙尖，舒緩情緒，夜間能量尤佳。'
  )
) AS v(name, category, price, tags, image_url, gallery_urls, status, description)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);
