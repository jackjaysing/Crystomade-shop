-- 會員推薦碼裂變行銷（可重複執行）
-- 於 Supabase SQL Editor 執行整段

-- ------------------------------------------------------------
-- 欄位：專屬推薦碼、推薦人
-- ------------------------------------------------------------
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES member_profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS member_profiles_referral_code_key
  ON member_profiles (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS member_profiles_referred_by_idx
  ON member_profiles (referred_by)
  WHERE referred_by IS NOT NULL;

-- ------------------------------------------------------------
-- 推薦首購獎勵冪等紀錄
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES member_profiles(id) ON DELETE CASCADE,
  checkout_id UUID,
  order_number TEXT,
  points INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_awards_referrer_idx
  ON referral_awards (referrer_user_id);

-- ------------------------------------------------------------
-- 產生 6 碼專屬推薦碼（排除易混淆字元）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_member_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code TEXT;
  v_i INTEGER;
  v_pick INTEGER;
BEGIN
  LOOP
    v_code := '';
    FOR v_i IN 1..6 LOOP
      v_pick := floor(random() * length(v_chars) + 1)::INTEGER;
      v_code := v_code || substr(v_chars, v_pick, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM member_profiles WHERE referral_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

-- 既有會員補碼
UPDATE member_profiles
SET referral_code = generate_member_referral_code(),
    updated_at = now()
WHERE referral_code IS NULL OR trim(referral_code) = '';

-- ------------------------------------------------------------
-- 依推薦碼查推薦人（排除自己）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_referrer_id(
  p_referral_code TEXT,
  p_new_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_referrer UUID;
BEGIN
  v_code := upper(trim(COALESCE(p_referral_code, '')));
  IF v_code = '' THEN RETURN NULL; END IF;

  SELECT id INTO v_referrer
  FROM member_profiles
  WHERE upper(referral_code) = v_code
  LIMIT 1;

  IF v_referrer IS NULL THEN RETURN NULL; END IF;
  IF p_new_user_id IS NOT NULL AND v_referrer = p_new_user_id THEN RETURN NULL; END IF;
  RETURN v_referrer;
END;
$$;

-- ------------------------------------------------------------
-- 確保會員已有推薦碼
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_member_referral_code(p_user_id UUID)
RETURNS member_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile member_profiles;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '無效的會員 ID';
  END IF;

  UPDATE member_profiles
  SET referral_code = generate_member_referral_code(),
      updated_at = now()
  WHERE id = p_user_id
    AND (referral_code IS NULL OR trim(referral_code) = '');

  SELECT * INTO v_profile FROM member_profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到會員資料';
  END IF;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_member_referral_code(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 會員中心事後補填推薦碼
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- auth 新使用者：建立會員（註冊禮改由 member_register_finalize 發放）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_member_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_real_name TEXT;
  v_birthday DATE;
  v_referral_input TEXT;
  v_referrer_id UUID;
  v_referral_code TEXT;
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_real_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'real_name', '')), '');
  v_birthday := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'birthday', '')), '')::date;
  v_referral_input := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')), '');

  IF v_phone IS NULL OR v_real_name IS NULL OR v_birthday IS NULL THEN
    RETURN NEW;
  END IF;

  v_referrer_id := resolve_referrer_id(v_referral_input, NEW.id);
  v_referral_code := generate_member_referral_code();

  INSERT INTO member_profiles (id, real_name, phone, birthday, points, referral_code, referred_by)
  VALUES (NEW.id, v_real_name, v_phone, v_birthday, 0, v_referral_code, v_referrer_id)
  ON CONFLICT (id) DO UPDATE SET
    real_name = EXCLUDED.real_name,
    phone = EXCLUDED.phone,
    birthday = EXCLUDED.birthday,
    referral_code = COALESCE(member_profiles.referral_code, EXCLUDED.referral_code),
    referred_by = COALESCE(member_profiles.referred_by, EXCLUDED.referred_by),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_member ON auth.users;
CREATE TRIGGER on_auth_user_created_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_member_user();

-- ------------------------------------------------------------
-- 註冊完成：同步資料、推薦關係、註冊禮（冪等）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS member_register_finalize(UUID, TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION member_register_finalize(
  p_user_id UUID,
  p_real_name TEXT,
  p_phone TEXT,
  p_birthday DATE,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS member_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_welcome INTEGER;
  v_balance INTEGER;
  v_profile member_profiles;
  v_existing_welcome INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '無效的會員 ID';
  END IF;

  v_referrer_id := resolve_referrer_id(p_referral_code, p_user_id);

  INSERT INTO member_profiles (id, real_name, phone, birthday, points, referral_code, referred_by)
  VALUES (
    p_user_id,
    trim(p_real_name),
    trim(p_phone),
    p_birthday,
    0,
    generate_member_referral_code(),
    v_referrer_id
  )
  ON CONFLICT (id) DO UPDATE SET
    real_name = EXCLUDED.real_name,
    phone = EXCLUDED.phone,
    birthday = EXCLUDED.birthday,
    referral_code = COALESCE(member_profiles.referral_code, EXCLUDED.referral_code),
    referred_by = COALESCE(member_profiles.referred_by, v_referrer_id),
    updated_at = now();

  IF v_referrer_id IS NULL THEN
    SELECT referred_by INTO v_referrer_id
    FROM member_profiles
    WHERE id = p_user_id;
  END IF;

  v_welcome := CASE WHEN v_referrer_id IS NOT NULL THEN 200 ELSE 100 END;

  SELECT COALESCE(MAX(delta), 0) INTO v_existing_welcome
  FROM points_history h
  WHERE h.user_id = p_user_id AND h.description LIKE '%新會員註冊禮%';

  IF v_existing_welcome = 0 THEN
    UPDATE member_profiles
    SET points = points + v_welcome, updated_at = now()
    WHERE id = p_user_id
    RETURNING points INTO v_balance;

    INSERT INTO points_history (user_id, delta, balance_after, description)
    VALUES (
      p_user_id,
      v_welcome,
      v_balance,
      '+' || v_welcome::text || ' 點（新會員註冊禮' ||
        CASE WHEN v_referrer_id IS NOT NULL THEN '・推薦專屬加碼' ELSE '' END ||
        '）'
    );
  ELSIF v_referrer_id IS NOT NULL AND v_existing_welcome < v_welcome THEN
    UPDATE member_profiles
    SET points = points + (v_welcome - v_existing_welcome), updated_at = now()
    WHERE id = p_user_id
    RETURNING points INTO v_balance;

    INSERT INTO points_history (user_id, delta, balance_after, description)
    VALUES (
      p_user_id,
      v_welcome - v_existing_welcome,
      v_balance,
      '+' || (v_welcome - v_existing_welcome)::text || ' 點（推薦專屬加碼）'
    );
  END IF;

  SELECT * INTO v_profile FROM member_profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '建立會員資料失敗';
  END IF;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION member_register_finalize(UUID, TEXT, TEXT, DATE, TEXT)
  TO anon, authenticated;

-- ------------------------------------------------------------
-- 好友首購：推薦人獲 500 點（冪等）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION try_award_referral_first_purchase(
  p_buyer_user_id UUID,
  p_checkout_id UUID,
  p_order_number TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer UUID;
  v_group_key TEXT;
  v_eligible BOOLEAN;
  v_completed_groups INTEGER;
  v_balance INTEGER;
  v_order_label TEXT;
  v_bonus INTEGER := 500;
BEGIN
  IF p_buyer_user_id IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM referral_awards WHERE referred_user_id = p_buyer_user_id
  ) THEN
    RETURN;
  END IF;

  SELECT referred_by INTO v_referrer
  FROM member_profiles
  WHERE id = p_buyer_user_id;

  IF v_referrer IS NULL OR v_referrer = p_buyer_user_id THEN RETURN; END IF;

  v_group_key := COALESCE(p_checkout_id::text, NULLIF(trim(p_order_number), ''));
  IF v_group_key IS NULL THEN RETURN; END IF;

  IF p_checkout_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.checkout_id = p_checkout_id
        AND o.user_id = p_buyer_user_id
        AND o.status <> 'cancelled'
        AND COALESCE(o.is_point_redemption, false) = false
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.order_number = p_order_number
        AND o.user_id = p_buyer_user_id
        AND o.status <> 'cancelled'
        AND COALESCE(o.is_point_redemption, false) = false
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;
  END IF;

  IF NOT v_eligible THEN RETURN; END IF;

  SELECT COUNT(*)::INTEGER INTO v_completed_groups
  FROM (
    SELECT DISTINCT COALESCE(o.checkout_id::text, NULLIF(trim(o.order_number), '')) AS grp
    FROM orders o
    WHERE o.user_id = p_buyer_user_id
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND (o.is_paid = true OR o.status = 'shipped')
      AND COALESCE(o.checkout_id::text, NULLIF(trim(o.order_number), '')) IS NOT NULL
  ) completed;

  IF v_completed_groups <> 1 THEN RETURN; END IF;

  INSERT INTO referral_awards (
    referrer_user_id,
    referred_user_id,
    checkout_id,
    order_number,
    points
  )
  VALUES (
    v_referrer,
    p_buyer_user_id,
    p_checkout_id,
    NULLIF(trim(p_order_number), ''),
    v_bonus
  );

  UPDATE member_profiles
  SET points = points + v_bonus, updated_at = now()
  WHERE id = v_referrer
  RETURNING points INTO v_balance;

  v_order_label := COALESCE(NULLIF(trim(p_order_number), ''), v_group_key);

  INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
  VALUES (
    v_referrer,
    v_bonus,
    v_balance,
    '好友成功首購，獲得裂變推薦獎勵 ' || v_bonus::text || ' 點（訂單 ' || v_order_label || '）',
    p_checkout_id,
    NULLIF(trim(p_order_number), '')
  );
EXCEPTION
  WHEN unique_violation THEN
    NULL;
END;
$$;

-- ------------------------------------------------------------
-- 訂單狀態更新：消費贈點 + 推薦首購獎勵
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION orders_points_award_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NOT NULL AND NEW.status <> 'cancelled' THEN
      IF (NEW.is_paid = true AND COALESCE(OLD.is_paid, false) IS DISTINCT FROM true)
         OR (NEW.status = 'shipped'::order_status AND OLD.status IS DISTINCT FROM 'shipped'::order_status) THEN
        PERFORM try_award_points_for_order_group(NEW.checkout_id, NEW.order_number, NEW.user_id);
        PERFORM try_award_referral_first_purchase(NEW.user_id, NEW.checkout_id, NEW.order_number);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_points_award_trigger ON orders;
CREATE TRIGGER orders_points_award_trigger
  AFTER UPDATE OF is_paid, status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_points_award_trigger_fn();
