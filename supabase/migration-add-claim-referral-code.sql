-- 會員中心事後補填推薦碼（可重複執行）
-- 若已執行過 migration-add-referral-system.sql，僅需執行本檔
-- 尚未執行推薦系統 migration 者，本函式已併入該檔，可略過

CREATE OR REPLACE FUNCTION claim_member_referral_code(
  p_user_id UUID,
  p_referral_code TEXT
)
RETURNS member_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_profile member_profiles;
  v_balance INTEGER;
  v_welcome INTEGER := 200;
  v_existing_welcome INTEGER;
  v_topup INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '無效的會員 ID';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION '無權限';
  END IF;

  IF NULLIF(trim(p_referral_code), '') IS NULL THEN
    RAISE EXCEPTION '請輸入推薦碼';
  END IF;

  SELECT * INTO v_profile FROM member_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到會員資料';
  END IF;

  IF v_profile.referred_by IS NOT NULL THEN
    RAISE EXCEPTION '您已綁定過推薦碼，無法重複填寫';
  END IF;

  v_referrer_id := resolve_referrer_id(p_referral_code, p_user_id);
  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION '推薦碼無效，請確認後再試';
  END IF;

  UPDATE member_profiles
  SET referred_by = v_referrer_id, updated_at = now()
  WHERE id = p_user_id;

  SELECT COALESCE(SUM(delta), 0) INTO v_existing_welcome
  FROM points_history h
  WHERE h.user_id = p_user_id
    AND (
      h.description LIKE '%新會員註冊禮%'
      OR h.description LIKE '%推薦專屬加碼%'
    );

  v_topup := GREATEST(0, v_welcome - v_existing_welcome);
  IF v_topup > 0 THEN
    UPDATE member_profiles
    SET points = points + v_topup, updated_at = now()
    WHERE id = p_user_id
    RETURNING points INTO v_balance;

    INSERT INTO points_history (user_id, delta, balance_after, description)
    VALUES (
      p_user_id,
      v_topup,
      v_balance,
      '+' || v_topup::text || ' 點（推薦專屬加碼）'
    );
  END IF;

  SELECT * INTO v_profile FROM member_profiles WHERE id = p_user_id;
  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_member_referral_code(UUID, TEXT) TO authenticated;
