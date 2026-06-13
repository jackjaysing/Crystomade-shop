-- 允許覆蓋壓縮後的商品圖（compress-storage 腳本 upsert 需要 UPDATE 權限）

DROP POLICY IF EXISTS "允許更新商品圖片" ON storage.objects;

CREATE POLICY "允許更新商品圖片"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');
