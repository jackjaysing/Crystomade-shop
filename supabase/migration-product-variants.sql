-- 商品多規格：同頁選 A/B/C，各規格獨立售價／庫存；共用商品封面
-- 於 Supabase SQL Editor 執行（可重複執行）

-- ------------------------------------------------------------
-- 1) 規格表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants (product_id, sort_order, created_at);

COMMENT ON TABLE product_variants IS '商品規格：獨立售價與庫存；封面沿用 products';
COMMENT ON COLUMN product_variants.name IS '規格名稱，如 水晶柱 A';
COMMENT ON COLUMN product_variants.price IS '規格原價（商品 discount_zhe 仍套用）';

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公開讀取商品規格" ON product_variants;
CREATE POLICY "公開讀取商品規格"
ON product_variants FOR SELECT
USING (true);

DROP POLICY IF EXISTS "允許新增商品規格" ON product_variants;
CREATE POLICY "允許新增商品規格"
ON product_variants FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "允許更新商品規格" ON product_variants;
CREATE POLICY "允許更新商品規格"
ON product_variants FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "允許刪除商品規格" ON product_variants;
CREATE POLICY "允許刪除商品規格"
ON product_variants FOR DELETE
USING (true);

-- ------------------------------------------------------------
-- 2) 訂單快照欄位
-- ------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_name TEXT;

COMMENT ON COLUMN orders.variant_id IS '下單規格（可空；無規格商品為 null）';
COMMENT ON COLUMN orders.variant_name IS '下單當下規格名稱快照';

CREATE INDEX IF NOT EXISTS idx_orders_variant_id ON orders (variant_id);

-- ------------------------------------------------------------
-- 3) 有規格時同步 products.stock／status
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_product_aggregate_stock(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_sum INTEGER;
BEGIN
  IF p_product_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER, COALESCE(SUM(stock), 0)::INTEGER
  INTO v_count, v_sum
  FROM product_variants
  WHERE product_id = p_product_id;

  IF v_count = 0 THEN
    RETURN;
  END IF;

  UPDATE products
  SET
    stock = v_sum,
    status = CASE
      WHEN v_sum <= 0 THEN 'sold'::product_status
      ELSE 'available'::product_status
    END
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_product_purchase_stock(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_count INTEGER;
  v_variant_name TEXT;
  v_stock INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_variant_count
  FROM product_variants
  WHERE product_id = p_product_id;

  IF v_variant_count > 0 THEN
    IF p_variant_id IS NULL THEN
      RAISE EXCEPTION '請選擇商品規格';
    END IF;

    SELECT name, stock
    INTO v_variant_name, v_stock
    FROM product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION '商品規格不存在';
    END IF;
    IF v_stock <= 0 THEN
      RAISE EXCEPTION '此規格已售罄，無法下單';
    END IF;

    UPDATE product_variants
    SET stock = stock - 1
    WHERE id = p_variant_id;

    PERFORM sync_product_aggregate_stock(p_product_id);
    RETURN v_variant_name;
  END IF;

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

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION increment_product_purchase_stock(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_count INTEGER;
BEGIN
  IF p_product_id IS NULL THEN
    RETURN;
  END IF;

  IF p_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock = stock + 1
    WHERE id = p_variant_id AND product_id = p_product_id;

    IF FOUND THEN
      PERFORM sync_product_aggregate_stock(p_product_id);
      RETURN;
    END IF;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_variant_count
  FROM product_variants
  WHERE product_id = p_product_id;

  IF v_variant_count > 0 THEN
    PERFORM sync_product_aggregate_stock(p_product_id);
    RETURN;
  END IF;

  UPDATE products
  SET
    stock = stock + 1,
    status = CASE
      WHEN stock + 1 > 0 THEN 'available'::product_status
      ELSE status
    END
  WHERE id = p_product_id;
END;
$$;

-- ------------------------------------------------------------
-- 4) 解析 paid line 單價／庫存（規格優先）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_paid_line_pricing(
  p_product_id UUID,
  p_variant_id UUID,
  OUT o_unit_price NUMERIC,
  OUT o_stock INTEGER,
  OUT o_product_name TEXT,
  OUT o_product_image TEXT,
  OUT o_variant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_count INTEGER;
  v_discount NUMERIC;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_variant_count
  FROM product_variants
  WHERE product_id = p_product_id;

  IF v_variant_count > 0 THEN
    IF p_variant_id IS NULL THEN
      RAISE EXCEPTION '請選擇商品規格';
    END IF;

    SELECT
      product_sale_price(pv.price, p.discount_zhe),
      pv.stock,
      p.name,
      p.image_url,
      pv.name,
      p.discount_zhe
    INTO
      o_unit_price,
      o_stock,
      o_product_name,
      o_product_image,
      o_variant_name,
      v_discount
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = p_variant_id
      AND pv.product_id = p_product_id
    FOR UPDATE OF pv, p;

    IF NOT FOUND THEN
      RAISE EXCEPTION '商品規格不存在';
    END IF;
    RETURN;
  END IF;

  SELECT
    product_sale_price(price, discount_zhe),
    stock,
    name,
    image_url,
    NULL::TEXT
  INTO
    o_unit_price,
    o_stock,
    o_product_name,
    o_product_image,
    o_variant_name
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '商品不存在';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 5) place_member_checkout（含魔法師運費／抽獎／配珠／規格）
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
  p_shipping_fee NUMERIC,
  p_raffle_gifts JSONB DEFAULT '[]'::jsonb,
  p_use_magician_shipping BOOLEAN DEFAULT false
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_red JSONB;
  v_gift JSONB;
  v_product_id UUID;
  v_variant_id UUID;
  v_variant_name TEXT;
  v_point_product_id UUID;
  v_member_coupon_id UUID;
  v_qty INTEGER;
  v_selected_size TEXT;
  v_bracelet_config JSONB;
  v_unit_price NUMERIC;
  v_stock INTEGER;
  v_pp_stock INTEGER;
  v_pp_points INTEGER;
  v_pp_name TEXT;
  v_pp_image TEXT;
  v_gift_note TEXT;
  v_product_subtotal NUMERIC := 0;
  v_discount_ntd NUMERIC := 0;
  v_discount_points INTEGER := 0;
  v_redemption_points INTEGER := 0;
  v_member_points INTEGER;
  v_balance INTEGER;
  v_order_number TEXT;
  v_shipping_assigned BOOLEAN := false;
  v_allocated_discount NUMERIC := 0;
  v_line_discount NUMERIC;
  v_amount NUMERIC;
  v_new_order orders;
  v_line_index INTEGER := 0;
  v_total_lines INTEGER := 0;
  v_is_first_paid BOOLEAN := true;
  v_checkout_discount_set BOOLEAN := false;
  v_effective_shipping NUMERIC := 0;
  v_mc member_coupons;
  v_coupon coupons;
  v_free_threshold NUMERIC := 600;
  v_standard_shipping NUMERIC := 60;
  v_has_paid_lines BOOLEAN;
  v_has_point_lines BOOLEAN;
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

  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_paid_lines, '[]'::jsonb))
  LOOP
    v_product_id := (v_line->>'product_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_line->>'quantity')::integer, 1));
    v_variant_id := NULLIF(trim(COALESCE(v_line->>'variant_id', '')), '')::uuid;

    SELECT o_unit_price, o_stock, o_product_name
    INTO v_unit_price, v_stock, v_pp_name
    FROM resolve_paid_line_pricing(v_product_id, v_variant_id);

    IF v_stock < v_qty THEN RAISE EXCEPTION '商品庫存不足'; END IF;
    v_product_subtotal := v_product_subtotal + v_unit_price * v_qty;
    v_total_lines := v_total_lines + v_qty;
  END LOOP;

  v_has_paid_lines := v_total_lines > 0;
  v_has_point_lines := jsonb_array_length(COALESCE(p_point_redemptions, '[]'::jsonb)) > 0;

  IF v_has_paid_lines AND v_product_subtotal >= v_free_threshold THEN
    v_effective_shipping := 0;
  ELSIF v_has_paid_lines AND COALESCE(p_use_magician_shipping, false) AND COALESCE(p_shipping_fee, 0) = 0 THEN
    PERFORM consume_member_magician_shipping(p_user_id);
    v_effective_shipping := 0;
  ELSIF v_has_paid_lines THEN
    IF COALESCE(p_shipping_fee, 0) <> v_standard_shipping THEN
      RAISE EXCEPTION '運費計算不正確';
    END IF;
    v_effective_shipping := v_standard_shipping;
  ELSIF v_has_point_lines THEN
    v_effective_shipping := CASE
      WHEN COALESCE(p_shipping_fee, 0) = 0 THEN 0
      WHEN COALESCE(p_shipping_fee, 0) = v_standard_shipping THEN v_standard_shipping
      ELSE NULL
    END;
    IF v_effective_shipping IS NULL THEN
      RAISE EXCEPTION '運費計算不正確';
    END IF;
  ELSE
    v_effective_shipping := 0;
  END IF;

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

  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_paid_lines, '[]'::jsonb))
  LOOP
    v_product_id := (v_line->>'product_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_line->>'quantity')::integer, 1));
    v_selected_size := NULLIF(trim(COALESCE(v_line->>'selected_size', '')), '');
    v_variant_id := NULLIF(trim(COALESCE(v_line->>'variant_id', '')), '')::uuid;
    v_bracelet_config := CASE
      WHEN jsonb_typeof(v_line->'bracelet_config') = 'object' THEN v_line->'bracelet_config'
      ELSE NULL
    END;

    SELECT o_unit_price, o_stock, o_product_name, o_product_image, o_variant_name
    INTO v_unit_price, v_stock, v_pp_name, v_pp_image, v_variant_name
    FROM resolve_paid_line_pricing(v_product_id, v_variant_id);

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

      v_variant_name := decrement_product_purchase_stock(v_product_id, v_variant_id);

      INSERT INTO orders (
        buyer_name, line_name, phone, cvs_brand, cvs_store,
        product_id, product_name, product_image_url, total_amount, status,
        checkout_id, order_number, selected_size, user_id,
        is_point_redemption, checkout_points_discount, checkout_discount_ntd,
        bracelet_config, variant_id, variant_name
      ) VALUES (
        trim(p_buyer_name), NULLIF(trim(COALESCE(p_line_name, '')), ''), trim(p_phone),
        p_cvs_brand, trim(p_cvs_store), v_product_id, v_pp_name, v_pp_image, v_amount,
        'pending'::order_status, p_checkout_id, v_order_number, v_selected_size, p_user_id,
        false,
        CASE WHEN NOT v_checkout_discount_set AND v_discount_points > 0 THEN v_discount_points ELSE NULL END,
        CASE WHEN NOT v_checkout_discount_set AND v_discount_ntd > 0 THEN v_discount_ntd ELSE NULL END,
        v_bracelet_config,
        v_variant_id,
        v_variant_name
      )
      RETURNING * INTO v_new_order;

      IF v_discount_points > 0 THEN v_checkout_discount_set := true; END IF;
      v_is_first_paid := false;
      RETURN NEXT v_new_order;
    END LOOP;
  END LOOP;

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

  FOR v_gift IN SELECT * FROM jsonb_array_elements(COALESCE(p_raffle_gifts, '[]'::jsonb))
  LOOP
    v_member_coupon_id := (v_gift->>'member_coupon_id')::uuid;

    SELECT mc.* INTO v_mc
    FROM member_coupons mc
    WHERE mc.id = v_member_coupon_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION '找不到禮物券'; END IF;
    IF v_mc.user_id <> p_user_id THEN RAISE EXCEPTION '禮物券不屬於此會員'; END IF;
    IF v_mc.status <> 'in_cart' THEN RAISE EXCEPTION '禮物券狀態異常，請重新兌換'; END IF;

    SELECT * INTO v_coupon FROM coupons WHERE id = v_mc.coupon_id;
    IF NOT FOUND OR v_coupon.coupon_type <> 'gift' OR v_coupon.redeem_mode <> 'cart' THEN
      RAISE EXCEPTION '無效的抽獎禮物券';
    END IF;

    v_pp_name := v_coupon.title;
    v_pp_image := COALESCE(v_coupon.image_url, '');
    v_gift_note := NULLIF(trim(COALESCE(v_coupon.gift_description, v_coupon.title)), '');

    v_amount := 0;

    UPDATE member_coupons
    SET status = 'used', used_at = now(), checkout_id = p_checkout_id
    WHERE id = v_member_coupon_id;

    INSERT INTO orders (
      buyer_name, line_name, phone, cvs_brand, cvs_store,
      product_id, product_name, product_image_url, total_amount, status,
      checkout_id, order_number, user_id,
      member_coupon_id, checkout_coupon_discount, coupon_gift_note
    ) VALUES (
      trim(p_buyer_name), NULLIF(trim(COALESCE(p_line_name, '')), ''), trim(p_phone),
      p_cvs_brand, trim(p_cvs_store),
      NULL,
      v_pp_name || '（抽獎禮物）',
      NULLIF(v_pp_image, ''),
      v_amount, 'pending'::order_status,
      p_checkout_id, v_order_number, p_user_id,
      v_member_coupon_id, 0, v_gift_note
    )
    RETURNING * INTO v_new_order;
    RETURN NEXT v_new_order;
  END LOOP;

  IF jsonb_array_length(COALESCE(p_paid_lines, '[]'::jsonb)) = 0
     AND jsonb_array_length(COALESCE(p_point_redemptions, '[]'::jsonb)) = 0
     AND jsonb_array_length(COALESCE(p_raffle_gifts, '[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION '抽獎禮物券需與付費商品或點數兌換品一同結帳，無法單獨出貨';
  END IF;

  IF jsonb_array_length(COALESCE(p_paid_lines, '[]'::jsonb)) = 0
     AND jsonb_array_length(COALESCE(p_point_redemptions, '[]'::jsonb)) = 0
     AND jsonb_array_length(COALESCE(p_raffle_gifts, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION '購物車是空的';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION place_member_checkout(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, NUMERIC, JSONB, BOOLEAN
) TO anon, authenticated;

-- ------------------------------------------------------------
-- 6) place_order_with_stock（可帶規格）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, JSONB
);

CREATE OR REPLACE FUNCTION place_order_with_stock(
  p_product_id UUID,
  p_total_amount NUMERIC,
  p_buyer_name TEXT,
  p_line_name TEXT,
  p_phone TEXT,
  p_cvs_brand TEXT,
  p_cvs_store TEXT,
  p_checkout_id UUID DEFAULT NULL,
  p_selected_size TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_bracelet_config JSONB DEFAULT NULL,
  p_variant_id UUID DEFAULT NULL
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
  v_product_image_url TEXT;
  v_variant_name TEXT;
  v_order_number TEXT;
  v_new_order orders;
BEGIN
  SELECT name, image_url
  INTO v_product_name, v_product_image_url
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '商品不存在';
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

  v_variant_name := decrement_product_purchase_stock(p_product_id, p_variant_id);

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
    order_number,
    selected_size,
    user_id,
    bracelet_config,
    variant_id,
    variant_name
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
    v_order_number,
    NULLIF(trim(COALESCE(p_selected_size, '')), ''),
    p_user_id,
    CASE
      WHEN jsonb_typeof(p_bracelet_config) = 'object' THEN p_bracelet_config
      ELSE NULL
    END,
    p_variant_id,
    v_variant_name
  )
  RETURNING * INTO v_new_order;

  RETURN NEXT v_new_order;
END;
$$;

GRANT EXECUTE ON FUNCTION place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, JSONB, UUID
) TO anon, authenticated;

-- ------------------------------------------------------------
-- 7) 取消訂單還規格庫存
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_order_group(p_order_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT id, product_id, variant_id, status
    FROM orders
    WHERE id = ANY(p_order_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF r.status = 'shipped'::order_status THEN
      RAISE EXCEPTION '已有出貨商品，無法取消訂單';
    END IF;

    IF r.status = 'cancelled'::order_status THEN
      CONTINUE;
    END IF;

    PERFORM increment_product_purchase_stock(r.product_id, r.variant_id);

    UPDATE orders
    SET status = 'cancelled'::order_status
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION '沒有可取消的訂單（可能已全部取消）';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_order_group(UUID[]) TO anon, authenticated;

-- ------------------------------------------------------------
-- 8) 軟刪除還規格庫存（以 soft-delete-refund-points 為底）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION soft_delete_order_group(p_order_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
  v_group RECORD;
  v_user_id UUID;
  v_checkout_id UUID;
  v_order_number TEXT;
  v_award_key TEXT;
  v_refund_spent INTEGER;
  v_clawback INTEGER;
  v_referral_clawback INTEGER;
  v_balance INTEGER;
  v_active_left INTEGER;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_group IN
    SELECT DISTINCT
      o.user_id,
      o.checkout_id,
      NULLIF(trim(o.order_number), '') AS order_number
    FROM orders o
    WHERE o.id = ANY(p_order_ids)
      AND o.deleted_at IS NULL
      AND o.user_id IS NOT NULL
  LOOP
    v_user_id := v_group.user_id;
    v_checkout_id := v_group.checkout_id;
    v_order_number := v_group.order_number;
    v_award_key := COALESCE(v_checkout_id::text, v_order_number);
    IF v_award_key IS NULL THEN
      CONTINUE;
    END IF;

    IF v_checkout_id IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_active_left
      FROM orders o
      WHERE o.checkout_id = v_checkout_id
        AND o.deleted_at IS NULL
        AND NOT (o.id = ANY(p_order_ids));
    ELSE
      SELECT COUNT(*)::INTEGER INTO v_active_left
      FROM orders o
      WHERE o.order_number = v_order_number
        AND o.deleted_at IS NULL
        AND NOT (o.id = ANY(p_order_ids));
    END IF;

    IF v_active_left > 0 THEN
      SELECT COALESCE(SUM(COALESCE(o.redemption_points, 0)), 0)::INTEGER
      INTO v_refund_spent
      FROM orders o
      WHERE o.id = ANY(p_order_ids)
        AND o.deleted_at IS NULL
        AND o.user_id = v_user_id
        AND (
          (v_checkout_id IS NOT NULL AND o.checkout_id = v_checkout_id)
          OR (v_checkout_id IS NULL AND NULLIF(trim(o.order_number), '') = v_order_number)
        );

      IF v_refund_spent > 0 THEN
        UPDATE member_profiles
        SET points = points + v_refund_spent, updated_at = now()
        WHERE id = v_user_id
        RETURNING points INTO v_balance;

        INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
        VALUES (
          v_user_id,
          v_refund_spent,
          v_balance,
          '訂單刪除，退還兌換點數 +' || v_refund_spent::text || ' 點',
          v_checkout_id,
          v_order_number
        );
      END IF;

      CONTINUE;
    END IF;

    SELECT
      COALESCE(SUM(COALESCE(o.checkout_points_discount, 0)), 0)::INTEGER
        + COALESCE(SUM(COALESCE(o.redemption_points, 0)), 0)::INTEGER
    INTO v_refund_spent
    FROM orders o
    WHERE o.deleted_at IS NULL
      AND o.user_id = v_user_id
      AND (
        (v_checkout_id IS NOT NULL AND o.checkout_id = v_checkout_id)
        OR (v_checkout_id IS NULL AND NULLIF(trim(o.order_number), '') = v_order_number)
      );

    SELECT COALESCE(pa.points, 0)::INTEGER
    INTO v_clawback
    FROM point_awards pa
    WHERE pa.award_key = v_award_key
      AND pa.user_id = v_user_id;

    v_clawback := COALESCE(v_clawback, 0);

    SELECT COALESCE(SUM(ra.points), 0)::INTEGER
    INTO v_referral_clawback
    FROM referral_awards ra
    WHERE ra.referred_user_id = v_user_id
      AND (
        (v_checkout_id IS NOT NULL AND ra.checkout_id = v_checkout_id)
        OR (
          v_checkout_id IS NULL
          AND v_order_number IS NOT NULL
          AND ra.order_number = v_order_number
        )
      );

    PERFORM 1 FROM member_profiles WHERE id = v_user_id FOR UPDATE;

    IF v_refund_spent > 0 THEN
      UPDATE member_profiles
      SET points = points + v_refund_spent, updated_at = now()
      WHERE id = v_user_id
      RETURNING points INTO v_balance;

      INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
      VALUES (
        v_user_id,
        v_refund_spent,
        v_balance,
        '訂單刪除，退還點數 +' || v_refund_spent::text || ' 點（折抵／兌換）',
        v_checkout_id,
        v_order_number
      );
    END IF;

    IF v_clawback > 0 THEN
      UPDATE member_profiles
      SET points = GREATEST(0, points - v_clawback), updated_at = now()
      WHERE id = v_user_id
      RETURNING points INTO v_balance;

      INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
      VALUES (
        v_user_id,
        -v_clawback,
        v_balance,
        '訂單刪除，收回消費贈點 -' || v_clawback::text || ' 點',
        v_checkout_id,
        v_order_number
      );

      DELETE FROM point_awards
      WHERE award_key = v_award_key
        AND user_id = v_user_id;
    END IF;

    IF v_referral_clawback > 0 THEN
      FOR r IN
        SELECT ra.id, ra.referrer_user_id, ra.points
        FROM referral_awards ra
        WHERE ra.referred_user_id = v_user_id
          AND (
            (v_checkout_id IS NOT NULL AND ra.checkout_id = v_checkout_id)
            OR (
              v_checkout_id IS NULL
              AND v_order_number IS NOT NULL
              AND ra.order_number = v_order_number
            )
          )
      LOOP
        UPDATE member_profiles
        SET points = GREATEST(0, points - r.points), updated_at = now()
        WHERE id = r.referrer_user_id
        RETURNING points INTO v_balance;

        INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
        VALUES (
          r.referrer_user_id,
          -r.points,
          v_balance,
          '訂單刪除，收回推薦獎勵 -' || r.points::text || ' 點',
          v_checkout_id,
          v_order_number
        );

        DELETE FROM referral_awards WHERE id = r.id;
      END LOOP;
    END IF;
  END LOOP;

  FOR r IN
    SELECT
      id,
      product_id,
      variant_id,
      status,
      deleted_at,
      point_product_id,
      COALESCE(is_point_redemption, false) AS is_point_redemption
    FROM orders
    WHERE id = ANY(p_order_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF r.deleted_at IS NOT NULL THEN
      CONTINUE;
    END IF;

    DELETE FROM crystal_soul_cards WHERE order_id = r.id;

    IF r.is_point_redemption AND r.point_product_id IS NOT NULL THEN
      UPDATE point_products
      SET stock = stock + 1, updated_at = now()
      WHERE id = r.point_product_id;
    END IF;

    IF r.status = 'pending'::order_status THEN
      IF r.product_id IS NOT NULL AND NOT r.is_point_redemption THEN
        PERFORM increment_product_purchase_stock(r.product_id, r.variant_id);
      END IF;

      UPDATE orders
      SET
        deleted_from_status = r.status,
        status = 'cancelled'::order_status,
        deleted_at = now()
      WHERE id = r.id;
    ELSE
      UPDATE orders
      SET
        deleted_from_status = r.status,
        deleted_at = now()
      WHERE id = r.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION '沒有可刪除的訂單（可能已刪除）';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_order_group(UUID[]) TO anon, authenticated;

COMMENT ON FUNCTION soft_delete_order_group IS
  '後台軟刪除訂單：退還折抵／兌換點數、收回贈點、移除魔導書、還規格／商品庫存';

GRANT EXECUTE ON FUNCTION sync_product_aggregate_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_product_purchase_stock(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_product_purchase_stock(UUID, UUID) TO anon, authenticated;
