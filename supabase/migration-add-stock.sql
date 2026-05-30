-- ============================================================
-- 庫存：products.stock · 下單扣 1 · 0 件自動售罄
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 1 CHECK (stock >= 0);

COMMENT ON COLUMN products.stock IS '庫存件數；每次成功下單扣 1，0 時顯示售罄';

-- 既有資料：已售出 → 0 件；上架中若無設定則維持 1 件
UPDATE products SET stock = 0 WHERE status = 'sold';
UPDATE products SET stock = 1 WHERE status = 'available' AND stock IS NULL;

-- 原子下單：鎖商品列 → 扣庫存 → 建立訂單
CREATE OR REPLACE FUNCTION place_order_with_stock(
  p_product_id UUID,
  p_total_amount NUMERIC,
  p_buyer_name TEXT,
  p_line_name TEXT,
  p_phone TEXT,
  p_cvs_brand TEXT,
  p_cvs_store TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
  v_new_order orders;
BEGIN
  SELECT stock INTO v_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '商品不存在';
  END IF;

  IF v_stock <= 0 THEN
    RAISE EXCEPTION '此商品已售罄，無法下單';
  END IF;

  UPDATE products
  SET
    stock = stock - 1,
    status = CASE WHEN stock - 1 <= 0 THEN 'sold'::product_status ELSE status END
  WHERE id = p_product_id;

  INSERT INTO orders (
    buyer_name,
    line_name,
    phone,
    cvs_brand,
    cvs_store,
    product_id,
    total_amount,
    status
  ) VALUES (
    trim(p_buyer_name),
    NULLIF(trim(COALESCE(p_line_name, '')), ''),
    trim(p_phone),
    p_cvs_brand,
    trim(p_cvs_store),
    p_product_id,
    p_total_amount,
    'pending'::order_status
  )
  RETURNING * INTO v_new_order;

  RETURN NEXT v_new_order;
END;
$$;

GRANT EXECUTE ON FUNCTION place_order_with_stock TO anon, authenticated;
