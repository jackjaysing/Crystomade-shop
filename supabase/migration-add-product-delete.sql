-- ============================================================
-- 允許後台刪除商品（RLS DELETE 政策）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

DROP POLICY IF EXISTS "刪除商品" ON products;
CREATE POLICY "刪除商品"
ON products FOR DELETE
USING (true);
