-- VIP 經驗累積紀錄：依日加總實付消費
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

CREATE OR REPLACE FUNCTION member_vip_xp_ledger(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  spend_date DATE,
  amount INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '無權限查詢其他會員的經驗累積紀錄';
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'Asia/Taipei')::date AS spend_date,
    SUM(order_vip_cash_amount(o.total_amount, o.is_point_redemption))::INTEGER AS amount
  FROM orders o
  WHERE o.user_id = p_user_id
    AND o.deleted_at IS NULL
    AND o.status <> 'cancelled'
    AND (o.is_paid = true OR o.status = 'shipped')
    AND order_vip_cash_amount(o.total_amount, o.is_point_redemption) > 0
  GROUP BY 1
  HAVING SUM(order_vip_cash_amount(o.total_amount, o.is_point_redemption)) > 0
  ORDER BY 1 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION order_vip_cash_amount(NUMERIC, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_vip_xp_ledger(UUID) TO anon, authenticated;
