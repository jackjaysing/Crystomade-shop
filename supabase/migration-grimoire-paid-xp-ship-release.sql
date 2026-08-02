-- 規則確認：
-- - 已付款：累積 VIP 經驗（實付），不對會員顯示身分證
-- - 已出貨：才 released_to_member = true，魔導書書架才看得到
-- 前置：請先執行 migration-grimoire-release-on-shipped.sql
-- 於 Supabase SQL Editor 執行（可重複執行）

-- 依訂單狀態重設發放旗標
UPDATE crystal_soul_cards c
SET released_to_member = (o.status = 'shipped' AND o.deleted_at IS NULL)
FROM orders o
WHERE o.id = c.order_id;

-- 已刪訂單不應再有靈魂卡
DELETE FROM crystal_soul_cards c
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = c.order_id AND o.deleted_at IS NOT NULL
);

-- VIP：已付款（或已出貨）即累積實付經驗；不依賴身分證
CREATE OR REPLACE FUNCTION member_eligible_purchase_amount(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN COALESCE(o.is_point_redemption, false) THEN 0
      ELSE GREATEST(0, ROUND(COALESCE(o.total_amount, 0))::INTEGER)
    END
  ), 0)::INTEGER
  FROM orders o
  WHERE p_user_id IS NOT NULL
    AND o.user_id = p_user_id
    AND o.deleted_at IS NULL
    AND o.status <> 'cancelled'
    AND COALESCE(o.is_point_redemption, false) = false
    AND (o.is_paid = true OR o.status = 'shipped');
$$;

-- 出貨才發放（建立＋開放）
CREATE OR REPLACE FUNCTION issue_crystal_soul_card_for_order(p_order_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.status <> 'shipped'
     OR v_order.deleted_at IS NOT NULL
     OR v_order.user_id IS NULL
     OR COALESCE(v_order.is_point_redemption, false) = true THEN
    RETURN NULL;
  END IF;

  v_card := create_crystal_soul_card_for_order_if_needed(p_order_id);
  IF v_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE crystal_soul_cards
  SET released_to_member = true
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- 後台準備：已付款可建卡，但預設不發放
CREATE OR REPLACE FUNCTION ensure_fulfillment_soul_card_for_order(p_order_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.user_id IS NULL
     OR v_order.deleted_at IS NOT NULL
     OR v_order.status = 'cancelled'
     OR COALESCE(v_order.is_point_redemption, false) = true
     OR (v_order.is_paid IS NOT TRUE AND v_order.status <> 'shipped') THEN
    RETURN NULL;
  END IF;

  v_card := create_crystal_soul_card_for_order_if_needed(p_order_id);
  IF v_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE crystal_soul_cards
  SET released_to_member = (v_order.status = 'shipped')
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- 觸發：僅出貨時對會員發放
CREATE OR REPLACE FUNCTION orders_soul_card_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NOT NULL
       AND NEW.deleted_at IS NULL
       AND COALESCE(NEW.is_point_redemption, false) = false
       AND NEW.status = 'shipped'::order_status
       AND OLD.status IS DISTINCT FROM 'shipped'::order_status THEN
      PERFORM issue_crystal_soul_card_for_order(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION member_eligible_purchase_amount(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION issue_crystal_soul_card_for_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_fulfillment_soul_card_for_order(UUID) TO authenticated;
