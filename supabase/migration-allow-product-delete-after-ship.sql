-- ============================================================
-- 出貨後可刪除商品：訂單保留快照、product_id 改 SET NULL
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS product_image_url TEXT;

UPDATE orders o
SET
  product_name = p.name,
  product_image_url = p.image_url
FROM products p
WHERE o.product_id = p.id
  AND (o.product_name IS NULL OR o.product_name = '');

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_id_fkey;

ALTER TABLE orders
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE orders
  ADD CONSTRAINT orders_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.product_name IS '下單當下商品名稱快照（商品刪除後仍保留）';
COMMENT ON COLUMN orders.product_image_url IS '下單當下商品封面快照';

DROP FUNCTION IF EXISTS place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT
);

DROP FUNCTION IF EXISTS place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID
);

CREATE OR REPLACE FUNCTION place_order_with_stock(
  p_product_id UUID,
  p_total_amount NUMERIC,
  p_buyer_name TEXT,
  p_line_name TEXT,
  p_phone TEXT,
  p_cvs_brand TEXT,
  p_cvs_store TEXT,
  p_checkout_id UUID DEFAULT NULL
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
  v_product_name TEXT;
  v_product_image_url TEXT;
  v_new_order orders;
BEGIN
  SELECT stock, name, image_url
  INTO v_stock, v_product_name, v_product_image_url
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
    product_name,
    product_image_url,
    total_amount,
    status,
    checkout_id
  ) VALUES (
    trim(p_buyer_name),
    NULLIF(trim(COALESCE(p_line_name, '')), ''),
    trim(p_phone),
    p_cvs_brand,
    trim(p_cvs_store),
    p_product_id,
    v_product_name,
    v_product_image_url,
    p_total_amount,
    'pending'::order_status,
    p_checkout_id
  )
  RETURNING * INTO v_new_order;

  RETURN NEXT v_new_order;
END;
$$;

GRANT EXECUTE ON FUNCTION place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID
) TO anon, authenticated;
