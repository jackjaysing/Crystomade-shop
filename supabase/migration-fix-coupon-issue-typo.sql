-- 修正 admin_issue_coupon_to_member（若先前貼錯 DECLARE 變數名）
-- 於 Supabase SQL Editor 執行

CREATE OR REPLACE FUNCTION admin_issue_coupon_to_member(
  p_coupon_id UUID,
  p_user_id UUID
)
RETURNS member_coupons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons;
  v_row member_coupons;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION '優惠券不存在或已停用';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM member_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION '找不到會員';
  END IF;

  v_expires := CASE
    WHEN v_coupon.valid_days IS NULL THEN NULL
    ELSE now() + (v_coupon.valid_days || ' days')::interval
  END;

  INSERT INTO member_coupons (user_id, coupon_id, expires_at)
  VALUES (p_user_id, p_coupon_id, v_expires)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_issue_coupon_to_member(UUID, UUID) TO anon, authenticated;
