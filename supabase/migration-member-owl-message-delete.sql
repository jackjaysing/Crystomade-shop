-- ============================================================
-- 貓頭鷹信件：軟刪除（會員端隱藏）— 可重複執行
-- 用 oid 強制 DROP，避免 42P13 cannot change return type
-- ============================================================

ALTER TABLE member_messages
  ADD COLUMN IF NOT EXISTS member_deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN member_messages.member_deleted_at IS
  '會員從信件匣刪除的時間；非空表示會員端不再顯示，後台仍保留';

CREATE INDEX IF NOT EXISTS idx_member_messages_recipient_visible
  ON member_messages (recipient_user_id, created_at DESC)
  WHERE member_deleted_at IS NULL;

-- 依 oid 強制刪除（比照 DROP FUNCTION name(args) 更可靠）
DO $drop$
DECLARE
  sig text;
BEGIN
  FOR sig IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_list_member_message_batches',
        'member_list_owl_messages',
        'member_unread_owl_message_count',
        'member_delete_owl_message'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || sig;
  END LOOP;
END
$drop$;

CREATE FUNCTION public.member_delete_owl_message(p_message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_updated INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;
  IF p_message_id IS NULL THEN
    RAISE EXCEPTION '請指定信件';
  END IF;

  UPDATE member_messages
  SET member_deleted_at = COALESCE(member_deleted_at, now())
  WHERE id = p_message_id
    AND recipient_user_id = auth.uid()
    AND member_deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION '找不到此信件，或已從信件匣移除';
  END IF;
END;
$fn$;

CREATE FUNCTION public.member_list_owl_messages(p_limit INTEGER DEFAULT 20)
RETURNS SETOF member_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  RETURN QUERY
  SELECT *
  FROM member_messages
  WHERE recipient_user_id = auth.uid()
    AND member_deleted_at IS NULL
  ORDER BY
    (read_at IS NULL) DESC,
    created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
END;
$fn$;

CREATE FUNCTION public.member_unread_owl_message_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*)::INTEGER INTO v_count
  FROM member_messages
  WHERE recipient_user_id = auth.uid()
    AND read_at IS NULL
    AND member_deleted_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$fn$;

CREATE FUNCTION public.admin_list_member_message_batches(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  batch_id UUID,
  subject TEXT,
  body TEXT,
  sent_by_admin_name TEXT,
  is_broadcast BOOLEAN,
  recipient_count INTEGER,
  read_count INTEGER,
  member_deleted_count INTEGER,
  created_at TIMESTAMPTZ,
  sample_recipient_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    m.batch_id,
    (array_agg(m.subject ORDER BY m.created_at))[1]::TEXT AS subject,
    (array_agg(m.body ORDER BY m.created_at))[1]::TEXT AS body,
    (array_agg(m.sent_by_admin_name ORDER BY m.created_at))[1]::TEXT AS sent_by_admin_name,
    bool_or(m.is_broadcast) AS is_broadcast,
    count(*)::INTEGER AS recipient_count,
    count(*) FILTER (WHERE m.read_at IS NOT NULL)::INTEGER AS read_count,
    count(*) FILTER (WHERE m.member_deleted_at IS NOT NULL)::INTEGER AS member_deleted_count,
    min(m.created_at) AS created_at,
    (
      SELECT mp.real_name
      FROM member_messages m2
      JOIN member_profiles mp ON mp.id = m2.recipient_user_id
      WHERE m2.batch_id = m.batch_id
      ORDER BY m2.created_at
      LIMIT 1
    ) AS sample_recipient_name
  FROM member_messages m
  GROUP BY m.batch_id
  ORDER BY min(m.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.member_delete_owl_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_list_owl_messages(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_unread_owl_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_member_message_batches(INTEGER) TO anon, authenticated;
