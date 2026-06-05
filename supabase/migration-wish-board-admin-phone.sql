-- ============================================================
-- 後台許願留言：一併回傳會員電話（辨識同名）
-- 若已執行 migration-add-wish-board.sql，請再執行本檔
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

DROP FUNCTION IF EXISTS fetch_all_wish_messages_admin();

CREATE OR REPLACE FUNCTION fetch_all_wish_messages_admin()
RETURNS TABLE (
  id UUID,
  content TEXT,
  display_name TEXT,
  member_id UUID,
  created_at TIMESTAMPTZ,
  member_phone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id,
    w.content,
    w.display_name,
    w.member_id,
    w.created_at,
    mp.phone AS member_phone
  FROM wish_messages w
  LEFT JOIN member_profiles mp ON mp.id = w.member_id
  ORDER BY w.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION fetch_all_wish_messages_admin() TO anon, authenticated;
