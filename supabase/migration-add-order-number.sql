-- ============================================================
-- 訂單編號 orders.order_number（同一 checkout_id 共用）
-- Supabase Dashboard → SQL Editor 執行
-- 格式：CM + YYMMDD + 3 位當日流水，例 CM260601001
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number
  ON orders (order_number)
  WHERE order_number IS NOT NULL;

COMMENT ON COLUMN orders.order_number IS '人類可讀訂單編號（同一結帳批次共用）';

CREATE TABLE IF NOT EXISTS order_number_counters (
  order_date DATE NOT NULL PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := (NOW() AT TIME ZONE 'Asia/Taipei')::DATE;
  v_seq INTEGER;
BEGIN
  INSERT INTO order_number_counters (order_date, last_seq)
  VALUES (v_date, 1)
  ON CONFLICT (order_date) DO UPDATE
  SET last_seq = order_number_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'CM' || TO_CHAR(v_date, 'YYMMDD') || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- 既有訂單補編號（同一 checkout_id 共用一組）
DO $$
DECLARE
  r RECORD;
  v_num TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT checkout_id
    FROM orders
    WHERE order_number IS NULL AND checkout_id IS NOT NULL
    ORDER BY checkout_id
  LOOP
    v_num := generate_order_number();
    UPDATE orders
    SET order_number = v_num
    WHERE checkout_id = r.checkout_id AND order_number IS NULL;
  END LOOP;

  FOR r IN
    SELECT id
    FROM orders
    WHERE order_number IS NULL
    ORDER BY created_at
  LOOP
    UPDATE orders
    SET order_number = generate_order_number()
    WHERE id = r.id;
  END LOOP;
END;
$$;

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
  v_order_number TEXT;
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

  IF p_checkout_id IS NOT NULL THEN
    SELECT order_number INTO v_order_number
    FROM orders
    WHERE checkout_id = p_checkout_id
    LIMIT 1;
  END IF;

  IF v_order_number IS NULL THEN
    v_order_number := generate_order_number();
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
    checkout_id,
    order_number
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
    p_checkout_id,
    v_order_number
  )
  RETURNING * INTO v_new_order;

  RETURN NEXT v_new_order;
END;
$$;

GRANT EXECUTE ON FUNCTION place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID
) TO anon, authenticated;
