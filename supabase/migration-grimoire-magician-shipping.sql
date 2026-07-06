-- 魔法師免運額度：追蹤、查詢、結帳核銷
-- 需先執行 migration-grimoire-magician-balance.sql
-- 於 Supabase SQL Editor 執行（可重複執行）

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS magician_shipping_period_key TEXT,
  ADD COLUMN IF NOT EXISTS magician_shipping_used INTEGER NOT NULL DEFAULT 0
    CHECK (magician_shipping_used >= 0);

COMMENT ON COLUMN member_profiles.magician_shipping_period_key IS '魔法師免運額度週期鍵（YYYY-MM 或 YYYY-Qn）';
COMMENT ON COLUMN member_profiles.magician_shipping_used IS '當週期已使用的魔法師免運次數';

-- ------------------------------------------------------------
-- 靈魂卡 → 巫師修為（與前端 soulCardMagicianXp 一致）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION crystal_magic_status_tier(p_status TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(COALESCE(p_status, ''))
    WHEN 'starlight' THEN 2
    WHEN 'awakening' THEN 3
    WHEN 'resonating' THEN 4
    WHEN 'ascendant' THEN 5
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION soul_card_magician_xp(p_card crystal_soul_cards)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_xp INTEGER := 15;
  v_status_tier INTEGER;
BEGIN
  IF p_card.contract_signed_at IS NOT NULL THEN
    v_xp := v_xp + 30;
  END IF;

  v_xp := v_xp + floor(p_card.energy_level * 0.4)::INTEGER;
  v_status_tier := crystal_magic_status_tier(p_card.magic_status);

  IF v_status_tier >= 2 THEN v_xp := v_xp + 25; END IF;
  IF v_status_tier >= 3 THEN v_xp := v_xp + 35; END IF;
  IF v_status_tier >= 4 THEN v_xp := v_xp + 45; END IF;
  IF v_status_tier >= 5 THEN v_xp := v_xp + 55; END IF;

  IF p_card.last_purify_at IS NOT NULL THEN v_xp := v_xp + 8; END IF;
  IF p_card.last_moon_charge_at IS NOT NULL THEN v_xp := v_xp + 8; END IF;
  IF p_card.last_meditation_at IS NOT NULL THEN v_xp := v_xp + 12; END IF;
  IF COALESCE(p_card.is_public, false) THEN v_xp := v_xp + 10; END IF;

  RETURN v_xp;
END;
$$;

CREATE OR REPLACE FUNCTION member_magician_total_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT COALESCE(mp.grimoire_merit_xp, 0) + COALESCE(SUM(soul_card_magician_xp(c)), 0)
    FROM member_profiles mp
    LEFT JOIN crystal_soul_cards c ON c.user_id = mp.id
    WHERE mp.id = p_user_id
    GROUP BY mp.grimoire_merit_xp
  ), 0);
$$;

CREATE OR REPLACE FUNCTION member_magician_tier(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_total_xp >= 1100 THEN 7
    WHEN p_total_xp >= 900 THEN 6
    WHEN p_total_xp >= 720 THEN 5
    WHEN p_total_xp >= 500 THEN 4
    WHEN p_total_xp >= 280 THEN 3
    WHEN p_total_xp >= 100 THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION magician_shipping_limit(p_tier INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_tier >= 7 THEN 2
    WHEN p_tier = 6 THEN 1
    WHEN p_tier = 5 THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION magician_shipping_period_key(p_tier INTEGER, p_now TIMESTAMPTZ DEFAULT now())
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM p_now)::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM p_now)::INTEGER;
  v_quarter INTEGER := CEIL(v_month / 3.0)::INTEGER;
BEGIN
  IF p_tier >= 6 THEN
    RETURN v_year::TEXT || '-' || lpad(v_month::TEXT, 2, '0');
  ELSIF p_tier = 5 THEN
    RETURN v_year::TEXT || '-Q' || v_quarter::TEXT;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION get_member_magician_shipping_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_xp INTEGER;
  v_tier INTEGER;
  v_limit INTEGER;
  v_period TEXT;
  v_used INTEGER;
  v_stored_period TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false);
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '無權限查詢其他會員的魔法師福利';
  END IF;

  v_total_xp := member_magician_total_xp(p_user_id);
  v_tier := member_magician_tier(v_total_xp);
  v_limit := magician_shipping_limit(v_tier);

  IF v_limit <= 0 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'tier', v_tier,
      'total_xp', v_total_xp,
      'limit', 0,
      'used', 0,
      'remaining', 0
    );
  END IF;

  v_period := magician_shipping_period_key(v_tier);

  SELECT magician_shipping_period_key, magician_shipping_used
  INTO v_stored_period, v_used
  FROM member_profiles
  WHERE id = p_user_id;

  IF v_stored_period IS DISTINCT FROM v_period THEN
    v_used := 0;
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'tier', v_tier,
    'total_xp', v_total_xp,
    'limit', v_limit,
    'used', v_used,
    'remaining', GREATEST(0, v_limit - v_used),
    'period_key', v_period
  );
END;
$$;

CREATE OR REPLACE FUNCTION consume_member_magician_shipping(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_xp INTEGER;
  v_tier INTEGER;
  v_limit INTEGER;
  v_period TEXT;
  v_used INTEGER;
  v_stored_period TEXT;
BEGIN
  v_total_xp := member_magician_total_xp(p_user_id);
  v_tier := member_magician_tier(v_total_xp);
  v_limit := magician_shipping_limit(v_tier);

  IF v_limit <= 0 THEN
    RAISE EXCEPTION '魔法師等級未達免運額度';
  END IF;

  v_period := magician_shipping_period_key(v_tier);

  SELECT magician_shipping_period_key, magician_shipping_used
  INTO v_stored_period, v_used
  FROM member_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到會員資料';
  END IF;

  IF v_stored_period IS DISTINCT FROM v_period THEN
    v_used := 0;
  END IF;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION '魔法師免運額度已用完';
  END IF;

  UPDATE member_profiles
  SET
    magician_shipping_period_key = v_period,
    magician_shipping_used = v_used + 1,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_magician_shipping_status(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_member_magician_shipping(UUID) TO anon, authenticated;

-- ------------------------------------------------------------
-- 結帳：支援魔法師免運額度（p_use_magician_shipping）
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
    SELECT product_sale_price(price, discount_zhe), stock, name
    INTO v_unit_price, v_stock, v_pp_name
    FROM products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION '商品不存在'; END IF;
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

DROP FUNCTION IF EXISTS place_member_checkout(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, NUMERIC, JSONB
);

GRANT EXECUTE ON FUNCTION place_member_checkout(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INTEGER, NUMERIC, JSONB, BOOLEAN
) TO anon, authenticated;
