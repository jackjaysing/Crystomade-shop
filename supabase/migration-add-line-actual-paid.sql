-- ============================================================
-- 品項實收：整單實際收款可攤到各商品，利潤／分潤依品項實收
-- （需先執行 migration-add-checkout-actual-paid.sql）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS line_actual_paid_ntd NUMERIC(12, 2);

COMMENT ON COLUMN orders.line_actual_paid_ntd IS
  '此訂單列的商品實收（不含運費；後台可整單攤分或逐項調整）';

-- 後台：設定整單實際收款，並寫入前端計算好的品項攤分
-- p_line_allocations: [{"order_id":"uuid","amount":123}, ...]
CREATE OR REPLACE FUNCTION admin_set_checkout_actual_paid_ntd(
  p_order_ids UUID[],
  p_actual_paid_ntd NUMERIC,
  p_line_allocations JSONB DEFAULT NULL
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
  v_item JSONB;
  v_order_id UUID;
  v_amount NUMERIC;
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
  SET checkout_actual_paid_ntd = v_value,
      line_actual_paid_ntd = NULL
  WHERE id = ANY(p_order_ids);

  IF v_value IS NOT NULL AND p_line_allocations IS NOT NULL AND jsonb_typeof(p_line_allocations) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_allocations)
    LOOP
      BEGIN
        v_order_id := (v_item->>'order_id')::uuid;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;

      IF v_order_id IS NULL OR NOT (v_order_id = ANY(p_order_ids)) THEN
        CONTINUE;
      END IF;

      v_amount := ROUND(COALESCE((v_item->>'amount')::numeric, 0), 2);
      IF v_amount < 0 THEN
        v_amount := 0;
      END IF;

      UPDATE orders
      SET line_actual_paid_ntd = v_amount
      WHERE id = v_order_id;
    END LOOP;
  END IF;

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

-- 後台：調整某一合併細項的商品實收，並回寫整單實際收款
CREATE OR REPLACE FUNCTION admin_set_line_actual_paid_ntd(
  p_order_ids UUID[],
  p_line_order_ids UUID[],
  p_line_actual_paid_ntd NUMERIC,
  p_shipping_fee_ntd NUMERIC DEFAULT 0
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
  v_line_total NUMERIC;
  v_n INTEGER;
  v_i INTEGER;
  v_share NUMERIC;
  v_allocated NUMERIC := 0;
  v_sum_lines NUMERIC;
  v_checkout_total NUMERIC;
  v_eligible BOOLEAN;
  v_row RECORD;
  v_fallback NUMERIC;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RAISE EXCEPTION '請提供訂單群組 ID';
  END IF;
  IF p_line_order_ids IS NULL OR array_length(p_line_order_ids, 1) IS NULL THEN
    RAISE EXCEPTION '請提供品項訂單 ID';
  END IF;
  IF p_line_actual_paid_ntd IS NULL OR p_line_actual_paid_ntd < 0 THEN
    RAISE EXCEPTION '品項實收須為 0 或以上';
  END IF;

  SELECT o.checkout_id, o.order_number, o.user_id
  INTO v_checkout_id, v_order_number, v_user_id
  FROM orders o
  WHERE o.id = p_order_ids[1];

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '此訂單無會員，無法設定品項實收';
  END IF;

  v_line_total := ROUND(p_line_actual_paid_ntd, 2);
  v_n := array_length(p_line_order_ids, 1);

  FOR v_i IN 1..v_n LOOP
    IF v_i = v_n THEN
      v_share := ROUND(v_line_total - v_allocated, 2);
    ELSE
      v_share := ROUND(v_line_total / v_n, 2);
      v_allocated := v_allocated + v_share;
    END IF;

    UPDATE orders
    SET line_actual_paid_ntd = GREATEST(0, v_share)
    WHERE id = p_line_order_ids[v_i]
      AND id = ANY(p_order_ids);
  END LOOP;

  -- 其他尚未填品項實收的付費列：用原列金額扣運費比例前的金額近似填入
  -- （前端通常會一次帶齊；此處避免整單加總缺漏）
  FOR v_row IN
    SELECT o.id, o.total_amount
    FROM orders o
    WHERE o.id = ANY(p_order_ids)
      AND o.line_actual_paid_ntd IS NULL
      AND COALESCE(o.is_point_redemption, false) = false
      AND (o.product_id IS NOT NULL OR o.product_name IS NOT NULL)
      AND NOT (o.product_id IS NULL AND o.member_coupon_id IS NOT NULL)
  LOOP
    v_fallback := GREATEST(0, ROUND(v_row.total_amount, 2));
    UPDATE orders SET line_actual_paid_ntd = v_fallback WHERE id = v_row.id;
  END LOOP;

  SELECT COALESCE(SUM(o.line_actual_paid_ntd), 0)
  INTO v_sum_lines
  FROM orders o
  WHERE o.id = ANY(p_order_ids)
    AND COALESCE(o.is_point_redemption, false) = false
    AND o.line_actual_paid_ntd IS NOT NULL;

  v_checkout_total := ROUND(v_sum_lines + GREATEST(0, COALESCE(p_shipping_fee_ntd, 0)), 2);

  UPDATE orders
  SET checkout_actual_paid_ntd = v_checkout_total
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

GRANT EXECUTE ON FUNCTION admin_set_checkout_actual_paid_ntd(UUID[], NUMERIC, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_line_actual_paid_ntd(UUID[], UUID[], NUMERIC, NUMERIC) TO anon, authenticated;

-- 相容舊兩參數呼叫（無攤分）
CREATE OR REPLACE FUNCTION admin_set_checkout_actual_paid_ntd(
  p_order_ids UUID[],
  p_actual_paid_ntd NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM admin_set_checkout_actual_paid_ntd(p_order_ids, p_actual_paid_ntd, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_checkout_actual_paid_ntd(UUID[], NUMERIC) TO anon, authenticated;
