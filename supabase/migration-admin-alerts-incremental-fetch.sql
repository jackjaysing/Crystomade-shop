-- 後台通知輪詢：僅抓取 watermark 之後的新資料（避免每 30 秒 dump 全表）

DROP FUNCTION IF EXISTS fetch_new_wish_messages_admin(timestamptz);

CREATE OR REPLACE FUNCTION fetch_new_wish_messages_admin(since timestamptz)
RETURNS TABLE (
  id UUID,
  content TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.content, w.display_name, w.created_at
  FROM wish_messages w
  WHERE w.created_at > since
  ORDER BY w.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION fetch_new_wish_messages_admin(timestamptz) TO anon, authenticated;

DROP FUNCTION IF EXISTS fetch_new_fortune_consultations_admin(timestamptz);

CREATE OR REPLACE FUNCTION fetch_new_fortune_consultations_admin(since timestamptz)
RETURNS TABLE (
  id UUID,
  question TEXT,
  display_name TEXT,
  member_real_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.question,
    f.display_name,
    mp.real_name AS member_real_name,
    f.created_at
  FROM fortune_consultation_requests f
  LEFT JOIN member_profiles mp ON mp.id = f.member_id
  WHERE f.created_at > since
  ORDER BY f.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION fetch_new_fortune_consultations_admin(timestamptz) TO anon, authenticated;
