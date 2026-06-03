-- 後台：刪除會員註冊資料（含 auth 帳號，點數紀錄連動刪除）
-- 於 Supabase SQL Editor 執行（可重複執行）

CREATE OR REPLACE FUNCTION admin_delete_member(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '無效的會員 ID';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.member_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION '找不到會員';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '刪除會員帳號失敗';
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_delete_member(UUID) IS
  '後台刪除會員：移除 auth 帳號與 member_profiles／點數紀錄；訂單 user_id 設為 NULL';

GRANT EXECUTE ON FUNCTION admin_delete_member(UUID) TO anon, authenticated;
