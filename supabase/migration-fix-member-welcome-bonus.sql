-- 修正新會員註冊贈 100 點（觸發器 + 註冊完成 RPC，可重複執行）
-- 於 Supabase SQL Editor 執行整段

-- ------------------------------------------------------------
-- auth 新使用者：建立會員並贈 100 點
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
  v_welcome INTEGER := 100;
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_real_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'real_name', '')), '');
  v_birthday := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'birthday', '')), '')::date;

  IF v_phone IS NULL OR v_real_name IS NULL OR v_birthday IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO member_profiles (id, real_name, phone, birthday, points)
  VALUES (NEW.id, v_real_name, v_phone, v_birthday, v_welcome)
  ON CONFLICT (id) DO UPDATE SET
    real_name = EXCLUDED.real_name,
    phone = EXCLUDED.phone,
    birthday = EXCLUDED.birthday,
    updated_at = now();

  INSERT INTO points_history (user_id, delta, balance_after, description)
  SELECT NEW.id, v_welcome, v_welcome, '+' || v_welcome::text || ' 點（新會員註冊禮）'
  WHERE NOT EXISTS (
    SELECT 1 FROM points_history h
    WHERE h.user_id = NEW.id AND h.description LIKE '%新會員註冊禮%'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_member ON auth.users;
CREATE TRIGGER on_auth_user_created_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_member_user();

-- ------------------------------------------------------------
-- 前端註冊完成：同步資料並補發註冊禮（冪等，已發過則跳過）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION member_register_finalize(
  p_user_id UUID,
  p_real_name TEXT,
  p_phone TEXT,
  p_birthday DATE
)
RETURNS member_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_welcome INTEGER := 100;
  v_balance INTEGER;
  v_profile member_profiles;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '無效的會員 ID';
  END IF;

  INSERT INTO member_profiles (id, real_name, phone, birthday, points)
  VALUES (p_user_id, trim(p_real_name), trim(p_phone), p_birthday, 0)
  ON CONFLICT (id) DO UPDATE SET
    real_name = EXCLUDED.real_name,
    phone = EXCLUDED.phone,
    birthday = EXCLUDED.birthday,
    updated_at = now();

  IF NOT EXISTS (
    SELECT 1 FROM points_history h
    WHERE h.user_id = p_user_id AND h.description LIKE '%新會員註冊禮%'
  ) THEN
    UPDATE member_profiles
    SET points = points + v_welcome, updated_at = now()
    WHERE id = p_user_id
    RETURNING points INTO v_balance;

    INSERT INTO points_history (user_id, delta, balance_after, description)
    VALUES (
      p_user_id,
      v_welcome,
      v_balance,
      '+' || v_welcome::text || ' 點（新會員註冊禮）'
    );
  END IF;

  SELECT * INTO v_profile FROM member_profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '建立會員資料失敗';
  END IF;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION member_register_finalize(UUID, TEXT, TEXT, DATE)
  TO anon, authenticated;
