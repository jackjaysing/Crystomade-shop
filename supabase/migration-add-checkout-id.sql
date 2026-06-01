-- ============================================================
-- 同一結帳批次：orders.checkout_id
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS checkout_id UUID;

CREATE INDEX IF NOT EXISTS idx_orders_checkout_id ON orders (checkout_id);

COMMENT ON COLUMN orders.checkout_id IS '同一結帳批次 UUID（購物車併單）';

-- 移除舊版函式（7 參數），避免與新版（8 參數）重複
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
    status,
    checkout_id
  ) VALUES (
    trim(p_buyer_name),
    NULLIF(trim(COALESCE(p_line_name, '')), ''),
    trim(p_phone),
    p_cvs_brand,
    trim(p_cvs_store),
    p_product_id,
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
