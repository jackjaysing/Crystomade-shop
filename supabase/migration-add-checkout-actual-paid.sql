-- ============================================================
-- 結帳實際收款：後台可記錄買家真實付款，消費贈點依此計算
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS checkout_actual_paid_ntd NUMERIC(12, 2);

COMMENT ON COLUMN orders.checkout_actual_paid_ntd IS
  '同一結帳批次的實際收款總額（後台填寫；未填則依訂單列 total_amount 加總計算贈點）';

-- 訂單群組應計入贈點／經驗的消費金額
CREATE OR REPLACE FUNCTION resolve_order_group_payable_ntd(
  p_checkout_id UUID,
  p_order_number TEXT,
  p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_sum NUMERIC;
  v_actual NUMERIC;
BEGIN
  IF p_checkout_id IS NOT NULL THEN
    SELECT COALESCE(SUM(o.total_amount), 0) INTO v_sum
    FROM orders o
    WHERE o.checkout_id = p_checkout_id
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND o.deleted_at IS NULL;

    SELECT MAX(o.checkout_actual_paid_ntd) INTO v_actual
    FROM orders o
    WHERE o.checkout_id = p_checkout_id
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND o.deleted_at IS NULL
      AND o.checkout_actual_paid_ntd IS NOT NULL;
  ELSE
    SELECT COALESCE(SUM(o.total_amount), 0) INTO v_sum
    FROM orders o
    WHERE o.order_number = p_order_number
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND o.deleted_at IS NULL;

    SELECT MAX(o.checkout_actual_paid_ntd) INTO v_actual
    FROM orders o
    WHERE o.order_number = p_order_number
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND o.deleted_at IS NULL
      AND o.checkout_actual_paid_ntd IS NOT NULL;
  END IF;

  IF v_actual IS NOT NULL AND v_actual >= 0 THEN
    RETURN v_actual;
  END IF;

  RETURN COALESCE(v_sum, 0);
END;
$$;

-- 依實際收款調整已發放的消費贈點（保留首購倍率）
CREATE OR REPLACE FUNCTION reconcile_order_group_consumption_points(
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
  v_awarded INTEGER;
  v_old_total NUMERIC;
  v_new_total NUMERIC;
  v_old_base INTEGER;
  v_new_base INTEGER;
  v_new_points INTEGER;
  v_delta INTEGER;
  v_balance INTEGER;
  v_order_label TEXT;
  v_desc TEXT;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  v_award_key := COALESCE(p_checkout_id::text, NULLIF(trim(p_order_number), ''));
  IF v_award_key IS NULL THEN RETURN; END IF;

  SELECT pa.points INTO v_awarded
  FROM point_awards pa
  WHERE pa.award_key = v_award_key
    AND pa.user_id = p_user_id;

  IF v_awarded IS NULL THEN RETURN; END IF;

  IF p_checkout_id IS NOT NULL THEN
    SELECT COALESCE(SUM(o.total_amount), 0) INTO v_old_total
    FROM orders o
    WHERE o.checkout_id = p_checkout_id
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND o.deleted_at IS NULL;
  ELSE
    SELECT COALESCE(SUM(o.total_amount), 0) INTO v_old_total
    FROM orders o
    WHERE o.order_number = p_order_number
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND o.deleted_at IS NULL;
  END IF;

  v_new_total := resolve_order_group_payable_ntd(
    p_checkout_id, p_order_number, p_user_id
  );

  v_old_base := FLOOR(v_old_total / 5)::INTEGER;
  v_new_base := FLOOR(v_new_total / 5)::INTEGER;

  IF v_old_base > 0 AND v_awarded > v_old_base THEN
    v_new_points := ROUND(v_new_base * (v_awarded::numeric / v_old_base::numeric))::INTEGER;
  ELSE
    v_new_points := v_new_base;
  END IF;

  IF v_new_points <= 0 AND v_awarded > 0 THEN
    v_new_points := 0;
  END IF;

  v_delta := v_new_points - v_awarded;
  IF v_delta = 0 THEN RETURN; END IF;

  UPDATE point_awards
  SET points = v_new_points
  WHERE award_key = v_award_key AND user_id = p_user_id;

  UPDATE member_profiles
  SET points = GREATEST(0, points + v_delta), updated_at = now()
  WHERE id = p_user_id
  RETURNING points INTO v_balance;

  v_order_label := COALESCE(NULLIF(trim(p_order_number), ''), v_award_key);
  v_desc := '消費贈點調整（訂單 ' || v_order_label || ' 實際收款 NT$ '
    || ROUND(v_new_total)::text || ' → ' || v_new_points::text || ' 點）';

  INSERT INTO points_history (
    user_id, delta, balance_after, description, checkout_id, order_number
  )
  VALUES (
    p_user_id,
    v_delta,
    v_balance,
    v_desc,
    p_checkout_id,
    NULLIF(trim(p_order_number), '')
  );
END;
$$;

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
  v_completed_groups INTEGER;
  v_first_purchase BOOLEAN := false;
  v_desc TEXT;
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
        AND o.deleted_at IS NULL
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.order_number = p_order_number AND o.user_id = p_user_id
        AND o.status <> 'cancelled' AND COALESCE(o.is_point_redemption, false) = false
        AND o.deleted_at IS NULL
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;
  END IF;

  IF NOT v_eligible THEN RETURN; END IF;

  v_total := resolve_order_group_payable_ntd(
    p_checkout_id, p_order_number, p_user_id
  );

  v_points := FLOOR(v_total / 5)::INTEGER;
  IF v_points <= 0 THEN RETURN; END IF;

  SELECT COUNT(*)::INTEGER INTO v_completed_groups
  FROM (
    SELECT DISTINCT COALESCE(o.checkout_id::text, NULLIF(trim(o.order_number), '')) AS grp
    FROM orders o
    WHERE o.user_id = p_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND o.deleted_at IS NULL
      AND (o.is_paid = true OR o.status = 'shipped')
      AND COALESCE(o.checkout_id::text, NULLIF(trim(o.order_number), '')) IS NOT NULL
  ) completed;

  IF v_completed_groups = 1 THEN
    v_first_purchase := true;
    v_points := v_points * 2;
  END IF;

  v_order_label := COALESCE(NULLIF(trim(p_order_number), ''), v_award_key);
  v_desc := '+' || v_points::text || ' 點（訂單 ' || v_order_label || ' 消費贈送';
  IF v_first_purchase THEN
    v_desc := v_desc || ' · 首購雙倍';
  END IF;
  v_desc := v_desc || '）';

  INSERT INTO point_awards (user_id, award_key, points)
  VALUES (p_user_id, v_award_key, v_points);

  UPDATE member_profiles SET points = points + v_points, updated_at = now()
  WHERE id = p_user_id RETURNING points INTO v_balance;

  INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
  VALUES (
    p_user_id, v_points, v_balance, v_desc,
    p_checkout_id, NULLIF(trim(p_order_number), '')
  );
END;
$$;

-- 後台：設定實際收款並同步贈點
CREATE OR REPLACE FUNCTION admin_set_checkout_actual_paid_ntd(
  p_order_ids UUID[],
  p_actual_paid_ntd NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout_id UUID;
  v_order_number TEXT;
  v_user_id UUID;
  v_value NUMERIC;
  v_eligible BOOLEAN;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RAISE EXCEPTION '請提供訂單 ID';
  END IF;

  SELECT o.checkout_id, o.order_number, o.user_id
  INTO v_checkout_id, v_order_number, v_user_id
  FROM orders o
  WHERE o.id = p_order_ids[1];

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '此訂單無會員，無法設定實際收款';
  END IF;

  IF p_actual_paid_ntd IS NULL OR p_actual_paid_ntd < 0 THEN
    v_value := NULL;
  ELSE
    v_value := ROUND(p_actual_paid_ntd, 2);
  END IF;

  UPDATE orders
  SET checkout_actual_paid_ntd = v_value
  WHERE id = ANY(p_order_ids);

  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = ANY(p_order_ids)
      AND o.status <> 'cancelled'
      AND (o.is_paid = true OR o.status = 'shipped')
  ) INTO v_eligible;

  IF v_eligible THEN
    PERFORM reconcile_order_group_consumption_points(
      v_checkout_id, v_order_number, v_user_id
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_checkout_actual_paid_ntd(UUID[], NUMERIC) TO anon, authenticated;
