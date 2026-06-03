-- 點數商城、結帳扣點／折抵、集點規則（$10=1點、註冊贈100點）
-- 於 Supabase SQL Editor 執行（可重複執行）

-- ------------------------------------------------------------
-- 點數商城商品
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  required_points INTEGER NOT NULL CHECK (required_points > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_products_active_sort
  ON point_products (is_active, sort_order, created_at DESC);

COMMENT ON TABLE point_products IS '點數商城兌換商品';

-- ------------------------------------------------------------
-- 訂單擴充：點數兌換品、折抵紀錄
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS point_product_id UUID REFERENCES point_products(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_point_redemption BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS redemption_points INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_points_discount INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_discount_ntd NUMERIC(12, 2);

-- ------------------------------------------------------------
-- 商品特價（與前端 productPricing 一致）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION product_sale_price(p_price NUMERIC, p_discount_zhe NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_discount_zhe IS NOT NULL AND p_discount_zhe > 0 AND p_discount_zhe < 10 THEN
      GREATEST(1, ROUND(p_price * p_discount_zhe / 10))
    ELSE p_price
  END;
$$;

-- ------------------------------------------------------------
-- 註冊贈 100 點（更新觸發器）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_member_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_real_name TEXT;
  v_birthday DATE;
  v_welcome INTEGER := 100;
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_real_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'real_name', '')), '');
  v_birthday := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'birthday', '')), '')::date;

  IF v_phone IS NULL OR v_real_name IS NULL OR v_birthday IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO member_profiles (id, real_name, phone, birthday, points)
  VALUES (NEW.id, v_real_name, v_phone, v_birthday, v_welcome)
  ON CONFLICT (id) DO UPDATE SET
    real_name = EXCLUDED.real_name,
    phone = EXCLUDED.phone,
    birthday = EXCLUDED.birthday,
    updated_at = now();

  INSERT INTO points_history (user_id, delta, balance_after, description)
  SELECT NEW.id, v_welcome, v_welcome, '+' || v_welcome::text || ' 點（新會員註冊禮）'
  WHERE NOT EXISTS (
    SELECT 1 FROM points_history h
    WHERE h.user_id = NEW.id AND h.description LIKE '%新會員註冊禮%'
  );

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 集點：每 NT$10 累積 1 點（已付款或已出貨）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION try_award_points_for_order_group(
  p_checkout_id UUID,
  p_order_number TEXT,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award_key TEXT;
  v_total NUMERIC;
  v_points INTEGER;
  v_balance INTEGER;
  v_order_label TEXT;
  v_eligible BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  v_award_key := COALESCE(p_checkout_id::text, NULLIF(trim(p_order_number), ''));
  IF v_award_key IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM point_awards WHERE award_key = v_award_key) THEN RETURN; END IF;

  IF p_checkout_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.checkout_id = p_checkout_id AND o.user_id = p_user_id
        AND o.status <> 'cancelled' AND COALESCE(o.is_point_redemption, false) = false
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;
    SELECT COALESCE(SUM(o.total_amount), 0) INTO v_total
    FROM orders o
    WHERE o.checkout_id = p_checkout_id AND o.user_id = p_user_id
      AND o.status <> 'cancelled' AND COALESCE(o.is_point_redemption, false) = false;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.order_number = p_order_number AND o.user_id = p_user_id
        AND o.status <> 'cancelled' AND COALESCE(o.is_point_redemption, false) = false
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;
    SELECT COALESCE(SUM(o.total_amount), 0) INTO v_total
    FROM orders o
    WHERE o.order_number = p_order_number AND o.user_id = p_user_id
      AND o.status <> 'cancelled' AND COALESCE(o.is_point_redemption, false) = false;
  END IF;

  IF NOT v_eligible THEN RETURN; END IF;

  v_points := FLOOR(v_total / 10)::INTEGER;
  IF v_points <= 0 THEN RETURN; END IF;

  v_order_label := COALESCE(NULLIF(trim(p_order_number), ''), v_award_key);

  INSERT INTO point_awards (user_id, award_key, points)
  VALUES (p_user_id, v_award_key, v_points);

  UPDATE member_profiles SET points = points + v_points, updated_at = now()
  WHERE id = p_user_id RETURNING points INTO v_balance;

  INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
  VALUES (
    p_user_id, v_points, v_balance,
    '+' || v_points::text || ' 點（訂單 ' || v_order_label || ' 消費贈送）',
    p_checkout_id, NULLIF(trim(p_order_number), '')
  );
END;
$$;

-- ------------------------------------------------------------
-- 會員結帳（扣點、折抵、點數兌換品）原子交易
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION place_member_checkout(
  p_checkout_id UUID,
  p_user_id UUID,
  p_buyer_name TEXT,
  p_line_name TEXT,
  p_phone TEXT,
  p_cvs_brand TEXT,
  p_cvs_store TEXT,
  p_paid_lines JSONB,
  p_point_redemptions JSONB,
  p_points_for_discount INTEGER,
  p_shipping_fee NUMERIC
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_red JSONB;
  v_product_id UUID;
  v_point_product_id UUID;
  v_qty INTEGER;
  v_selected_size TEXT;
  v_unit_price NUMERIC;
  v_stock INTEGER;
  v_pp_stock INTEGER;
  v_pp_points INTEGER;
  v_pp_name TEXT;
  v_pp_image TEXT;
  v_product_subtotal NUMERIC := 0;
  v_discount_ntd NUMERIC := 0;
  v_discount_points INTEGER := 0;
  v_redemption_points INTEGER := 0;
  v_member_points INTEGER;
  v_balance INTEGER;
  v_order_number TEXT;
  v_shipping_assigned BOOLEAN := false;
  v_line_total NUMERIC;
  v_allocated_discount NUMERIC := 0;
  v_line_discount NUMERIC;
  v_amount NUMERIC;
  v_new_order orders;
  v_line_index INTEGER := 0;
  v_total_lines INTEGER := 0;
  v_is_first_paid BOOLEAN := true;
  v_checkout_discount_set BOOLEAN := false;
  v_effective_shipping NUMERIC := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '需要登入會員才能使用點數結帳';
  END IF;

  SELECT points INTO v_member_points FROM member_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到會員資料';
  END IF;

  IF p_checkout_id IS NOT NULL THEN
    SELECT order_number INTO v_order_number FROM orders WHERE checkout_id = p_checkout_id LIMIT 1;
  END IF;
  IF v_order_number IS NULL THEN
    v_order_number := generate_order_number();
  END IF;

  -- 計算商品小計
  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_paid_lines, '[]'::jsonb))
  LOOP
    v_product_id := (v_line->>'product_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_line->>'quantity')::integer, 1));
    SELECT product_sale_price(price, discount_zhe), stock, name
    INTO v_unit_price, v_stock, v_pp_name
    FROM products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION '商品不存在'; END IF;
    IF v_stock < v_qty THEN RAISE EXCEPTION '商品庫存不足'; END IF;
    v_product_subtotal := v_product_subtotal + v_unit_price * v_qty;
    v_total_lines := v_total_lines + v_qty;
  END LOOP;

  -- 兌換品不可折抵運費；僅兌換時仍收運費（併入第一筆訂單列）
  v_effective_shipping := CASE
    WHEN v_total_lines > 0 THEN GREATEST(0, COALESCE(p_shipping_fee, 0))
    WHEN jsonb_array_length(COALESCE(p_point_redemptions, '[]'::jsonb)) > 0
      THEN GREATEST(0, COALESCE(p_shipping_fee, 0))
    ELSE 0
  END;

  -- 點數兌換品所需點數
  FOR v_red IN SELECT * FROM jsonb_array_elements(COALESCE(p_point_redemptions, '[]'::jsonb))
  LOOP
    v_point_product_id := (v_red->>'point_product_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_red->>'quantity')::integer, 1));
    SELECT required_points, stock, name, image_url
    INTO v_pp_points, v_pp_stock, v_pp_name, v_pp_image
    FROM point_products WHERE id = v_point_product_id AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION '點數商品不存在或已下架'; END IF;
    IF v_pp_stock < v_qty THEN RAISE EXCEPTION '點數商品庫存不足'; END IF;
    v_redemption_points := v_redemption_points + v_pp_points * v_qty;
  END LOOP;

  v_discount_points := GREATEST(0, COALESCE(p_points_for_discount, 0));
  v_discount_ntd := LEAST(
    FLOOR(v_discount_points::numeric / 10),
    FLOOR(v_product_subtotal * 0.1),
    v_product_subtotal
  );
  v_discount_points := (v_discount_ntd * 10)::integer;

  IF v_member_points < v_redemption_points + v_discount_points THEN
    RAISE EXCEPTION '點數不足，無法完成結帳';
  END IF;

  -- 先扣點
  IF v_redemption_points + v_discount_points > 0 THEN
    UPDATE member_profiles
    SET points = points - (v_redemption_points + v_discount_points), updated_at = now()
    WHERE id = p_user_id
    RETURNING points INTO v_balance;

    IF v_redemption_points > 0 THEN
      INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
      VALUES (
        p_user_id, -v_redemption_points,
        v_balance + v_discount_points,
        '-' || v_redemption_points::text || ' 點（點數商城兌換）',
        p_checkout_id, v_order_number
      );
    END IF;
    IF v_discount_points > 0 THEN
      INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
      VALUES (
        p_user_id, -v_discount_points, v_balance,
        '-' || v_discount_points::text || ' 點（折抵 NT$' || v_discount_ntd::text || '）',
        p_checkout_id, v_order_number
      );
    END IF;
  END IF;

  -- 付費商品訂單列
  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_paid_lines, '[]'::jsonb))
  LOOP
    v_product_id := (v_line->>'product_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_line->>'quantity')::integer, 1));
    v_selected_size := NULLIF(trim(COALESCE(v_line->>'selected_size', '')), '');

    SELECT product_sale_price(price, discount_zhe), stock, name, image_url
    INTO v_unit_price, v_stock, v_pp_name, v_pp_image
    FROM products WHERE id = v_product_id FOR UPDATE;

    FOR i IN 1..v_qty LOOP
      v_line_index := v_line_index + 1;
      v_line_discount := 0;
      IF v_product_subtotal > 0 AND v_discount_ntd > 0 THEN
        IF v_line_index = v_total_lines THEN
          v_line_discount := v_discount_ntd - v_allocated_discount;
        ELSE
          v_line_discount := ROUND(v_discount_ntd * (v_unit_price / v_product_subtotal), 2);
          v_allocated_discount := v_allocated_discount + v_line_discount;
        END IF;
      END IF;

      v_amount := GREATEST(0, v_unit_price - v_line_discount);
      IF NOT v_shipping_assigned AND v_effective_shipping > 0 AND v_is_first_paid THEN
        v_amount := v_amount + v_effective_shipping;
        v_shipping_assigned := true;
      END IF;

      UPDATE products SET
        stock = stock - 1,
        status = CASE WHEN stock - 1 <= 0 THEN 'sold'::product_status ELSE status END
      WHERE id = v_product_id;

      INSERT INTO orders (
        buyer_name, line_name, phone, cvs_brand, cvs_store,
        product_id, product_name, product_image_url, total_amount, status,
        checkout_id, order_number, selected_size, user_id,
        is_point_redemption, checkout_points_discount, checkout_discount_ntd
      ) VALUES (
        trim(p_buyer_name), NULLIF(trim(COALESCE(p_line_name, '')), ''), trim(p_phone),
        p_cvs_brand, trim(p_cvs_store), v_product_id, v_pp_name, v_pp_image, v_amount,
        'pending'::order_status, p_checkout_id, v_order_number, v_selected_size, p_user_id,
        false,
        CASE WHEN NOT v_checkout_discount_set AND v_discount_points > 0 THEN v_discount_points ELSE NULL END,
        CASE WHEN NOT v_checkout_discount_set AND v_discount_ntd > 0 THEN v_discount_ntd ELSE NULL END
      )
      RETURNING * INTO v_new_order;

      IF v_discount_points > 0 THEN v_checkout_discount_set := true; END IF;
      v_is_first_paid := false;
      RETURN NEXT v_new_order;
    END LOOP;
  END LOOP;

  -- 點數兌換訂單列
  FOR v_red IN SELECT * FROM jsonb_array_elements(COALESCE(p_point_redemptions, '[]'::jsonb))
  LOOP
    v_point_product_id := (v_red->>'point_product_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_red->>'quantity')::integer, 1));

    SELECT required_points, stock, name, image_url
    INTO v_pp_points, v_pp_stock, v_pp_name, v_pp_image
    FROM point_products WHERE id = v_point_product_id FOR UPDATE;

    FOR i IN 1..v_qty LOOP
      UPDATE point_products SET stock = stock - 1, updated_at = now() WHERE id = v_point_product_id;

      v_amount := 0;
      IF NOT v_shipping_assigned AND v_effective_shipping > 0 THEN
        v_amount := v_effective_shipping;
        v_shipping_assigned := true;
      END IF;

      INSERT INTO orders (
        buyer_name, line_name, phone, cvs_brand, cvs_store,
        product_id, product_name, product_image_url, total_amount, status,
        checkout_id, order_number, user_id,
        is_point_redemption, point_product_id, redemption_points
      ) VALUES (
        trim(p_buyer_name), NULLIF(trim(COALESCE(p_line_name, '')), ''), trim(p_phone),
        p_cvs_brand, trim(p_cvs_store),
        NULL,
        v_pp_name || '（點數兌換）',
        v_pp_image, v_amount, 'pending'::order_status,
        p_checkout_id, v_order_number, p_user_id,
        true, v_point_product_id, v_pp_points
      )
      RETURNING * INTO v_new_order;
      RETURN NEXT v_new_order;
    END LOOP;
  END LOOP;

  IF jsonb_array_length(COALESCE(p_paid_lines, '[]'::jsonb)) = 0
     AND jsonb_array_length(COALESCE(p_point_redemptions, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION '購物車是空的';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION place_member_checkout(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, NUMERIC
) TO anon, authenticated;

-- ------------------------------------------------------------
-- RLS：點數商品
-- ------------------------------------------------------------
ALTER TABLE point_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公開讀取上架點數商品" ON point_products;
DROP POLICY IF EXISTS "後台管理點數商品" ON point_products;
DROP POLICY IF EXISTS "後台讀取全部點數商品" ON point_products;
DROP POLICY IF EXISTS "後台新增點數商品" ON point_products;
DROP POLICY IF EXISTS "後台更新點數商品" ON point_products;
DROP POLICY IF EXISTS "後台刪除點數商品" ON point_products;

CREATE POLICY "公開讀取上架點數商品"
ON point_products FOR SELECT
TO anon, authenticated
USING (is_active = true);

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
