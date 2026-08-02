-- VIP／單本經驗值：只認「實付現金」
-- - 點數折抵：下單時已從 orders.total_amount 扣除，故不會計入
-- - 點數兌換品（is_point_redemption）：整筆不計
-- - 已取消：不計
-- 於 Supabase SQL Editor 執行（可重複執行）

CREATE OR REPLACE FUNCTION order_vip_cash_amount(p_total_amount NUMERIC, p_is_point_redemption BOOLEAN)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_is_point_redemption, false) THEN 0
    ELSE GREATEST(0, ROUND(COALESCE(p_total_amount, 0))::INTEGER)
  END;
$$;

CREATE OR REPLACE FUNCTION member_eligible_purchase_amount(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    order_vip_cash_amount(o.total_amount, o.is_point_redemption)
  ), 0)::INTEGER
  FROM orders o
  WHERE p_user_id IS NOT NULL
    AND o.user_id = p_user_id
    AND o.deleted_at IS NULL
    AND o.status <> 'cancelled'
    AND (o.is_paid = true OR o.status = 'shipped');
$$;

CREATE OR REPLACE FUNCTION member_vip_purchase_xp(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '無權限查詢其他會員的經驗值';
  END IF;

  RETURN member_eligible_purchase_amount(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION member_magician_total_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT member_eligible_purchase_amount(p_user_id);
$$;

-- 單本經驗值：同步為該筆訂單實付（已扣點數折抵；兌換品為 0）
ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS purchase_amount INTEGER;

COMMENT ON COLUMN crystal_soul_cards.purchase_amount IS
  '單本經驗值＝訂單實付金額（點數折抵已扣；點數兌換＝0）';

UPDATE crystal_soul_cards c
SET purchase_amount = order_vip_cash_amount(o.total_amount, o.is_point_redemption)
FROM orders o
WHERE o.id = c.order_id;

CREATE OR REPLACE FUNCTION crystal_soul_cards_set_purchase_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount INTEGER;
  v_is_redemption BOOLEAN;
BEGIN
  SELECT
    order_vip_cash_amount(total_amount, is_point_redemption),
    COALESCE(is_point_redemption, false)
  INTO v_amount, v_is_redemption
  FROM orders
  WHERE id = NEW.order_id;

  NEW.purchase_amount := COALESCE(v_amount, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crystal_soul_cards_purchase_amount_bi ON crystal_soul_cards;
CREATE TRIGGER crystal_soul_cards_purchase_amount_bi
  BEFORE INSERT ON crystal_soul_cards
  FOR EACH ROW
  EXECUTE FUNCTION crystal_soul_cards_set_purchase_amount();

GRANT EXECUTE ON FUNCTION order_vip_cash_amount(NUMERIC, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_eligible_purchase_amount(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_vip_purchase_xp(UUID) TO anon, authenticated;
