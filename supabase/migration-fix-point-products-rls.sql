-- 修正 point_products RLS：後台（anon）可新增／編輯／刪除
-- 於 Supabase SQL Editor 執行

ALTER TABLE point_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公開讀取上架點數商品" ON point_products;
DROP POLICY IF EXISTS "後台管理點數商品" ON point_products;
DROP POLICY IF EXISTS "後台讀取全部點數商品" ON point_products;
DROP POLICY IF EXISTS "後台新增點數商品" ON point_products;
DROP POLICY IF EXISTS "後台更新點數商品" ON point_products;
DROP POLICY IF EXISTS "後台刪除點數商品" ON point_products;

-- 前台：僅讀取上架中
CREATE POLICY "公開讀取上架點數商品"
ON point_products FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 後台：與 products 表相同，允許 anon 完整管理
CREATE POLICY "後台讀取全部點數商品"
ON point_products FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "後台新增點數商品"
ON point_products FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "後台更新點數商品"
ON point_products FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "後台刪除點數商品"
ON point_products FOR DELETE
TO anon, authenticated
USING (true);
