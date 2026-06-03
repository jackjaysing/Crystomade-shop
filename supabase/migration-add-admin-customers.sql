-- 後台：查詢／調整會員資料與點數
-- 於 Supabase SQL Editor 執行（可重複執行）

DROP POLICY IF EXISTS "後台讀取全部會員" ON member_profiles;
CREATE POLICY "後台讀取全部會員"
ON member_profiles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "後台更新會員點數" ON member_profiles;
CREATE POLICY "後台更新會員點數"
ON member_profiles FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "後台讀取點數紀錄" ON points_history;
CREATE POLICY "後台讀取點數紀錄"
ON points_history FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "後台寫入點數紀錄" ON points_history;
CREATE POLICY "後台寫入點數紀錄"
ON points_history FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 後台調整會員點數（寫入異動紀錄）
CREATE OR REPLACE FUNCTION admin_set_member_points(
  p_user_id UUID,
  p_new_points INTEGER,
  p_reason TEXT DEFAULT '後台調整點數'
)
RETURNS member_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old INTEGER;
  v_delta INTEGER;
  v_profile member_profiles;
  v_desc TEXT;
BEGIN
  IF p_new_points < 0 THEN
    RAISE EXCEPTION '點數不可為負數';
  END IF;

  SELECT points INTO v_old
  FROM member_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到會員';
  END IF;

  v_delta := p_new_points - v_old;

  UPDATE member_profiles
  SET points = p_new_points, updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  IF v_delta <> 0 THEN
    v_desc := trim(COALESCE(p_reason, '後台調整點數'));
    IF v_delta > 0 THEN
      v_desc := v_desc || ' (+' || v_delta::text || ')';
    ELSE
      v_desc := v_desc || ' (' || v_delta::text || ')';
    END IF;

    INSERT INTO points_history (user_id, delta, balance_after, description)
    VALUES (p_user_id, v_delta, p_new_points, v_desc);
  END IF;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_member_points(UUID, INTEGER, TEXT)
  TO anon, authenticated;
