-- ============================================================
-- 緊急修復：只重建 admin_list_member_message_batches
-- 若整份 migration 仍 42P13，先單獨跑這一檔
-- ============================================================

ALTER TABLE member_messages
  ADD COLUMN IF NOT EXISTS member_deleted_at TIMESTAMPTZ;

DO $drop$
DECLARE
  sig text;
BEGIN
  FOR sig IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_list_member_message_batches'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || sig || ' CASCADE';
  END LOOP;
END
$drop$;

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

GRANT EXECUTE ON FUNCTION public.admin_list_member_message_batches(INTEGER) TO anon, authenticated;
