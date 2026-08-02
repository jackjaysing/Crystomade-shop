-- VIP 等級：經驗值 = 累積實付消費（點數折抵已反映在 total_amount；點數兌換不計）
-- 門檻：0 / 3000 / 8000 / 15000 / 25000 / 35000 / 50000（最高 VIP = 五萬）
-- 建議改跑更新版：migration-grimoire-vip-cash-only-xp.sql
-- 於 Supabase SQL Editor 執行（可重複執行）

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

CREATE OR REPLACE FUNCTION member_magician_tier(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_total_xp >= 50000 THEN 7
    WHEN p_total_xp >= 35000 THEN 6
    WHEN p_total_xp >= 25000 THEN 5
    WHEN p_total_xp >= 15000 THEN 4
    WHEN p_total_xp >= 8000 THEN 3
    WHEN p_total_xp >= 3000 THEN 2
    ELSE 1
  END;
$$;

GRANT EXECUTE ON FUNCTION member_eligible_purchase_amount(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_vip_purchase_xp(UUID) TO anon, authenticated;
