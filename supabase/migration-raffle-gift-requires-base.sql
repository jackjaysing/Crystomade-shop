-- 抽獎禮物券不可單獨結帳出貨（須搭配付費商品或點數兌換）
-- 若已執行 migration-raffle-prize-gift-coupon.sql，可只執行本段更新 place_member_checkout

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
  p_raffle_gifts JSONB DEFAULT '[]'::jsonb
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
  v_point_product_id UUID;
  v_member_coupon_id UUID;
  v_qty INTEGER;
  v_selected_size TEXT;
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
    SELECT product_sale_price(price, discount_zhe), stock, name
    INTO v_unit_price, v_stock, v_pp_name
    FROM products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION '商品不存在'; END IF;
    IF v_stock < v_qty THEN RAISE EXCEPTION '商品庫存不足'; END IF;
    v_product_subtotal := v_product_subtotal + v_unit_price * v_qty;
    v_total_lines := v_total_lines + v_qty;
  END LOOP;

  v_effective_shipping := CASE
    WHEN v_total_lines > 0 THEN GREATEST(0, COALESCE(p_shipping_fee, 0))
    WHEN jsonb_array_length(COALESCE(p_point_redemptions, '[]'::jsonb)) > 0
      THEN GREATEST(0, COALESCE(p_shipping_fee, 0))
    ELSE 0
  END;

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
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, NUMERIC, JSONB
) TO anon, authenticated;
