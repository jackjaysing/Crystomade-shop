-- 商品多圖相簿（詳情頁用，封面仍用 image_url）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN products.gallery_urls IS '詳情頁額外圖片 URL 陣列（不含封面）';
