-- ============================================================
-- 貓頭鷹信件：後台寄給指定會員或全體會員
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS member_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  sent_by_admin_name TEXT NOT NULL DEFAULT '',
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  member_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 相容舊庫：若先前已建表但沒有此欄位
ALTER TABLE member_messages
  ADD COLUMN IF NOT EXISTS member_deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_member_messages_recipient_created
  ON member_messages (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_messages_recipient_unread
  ON member_messages (recipient_user_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_messages_batch
  ON member_messages (batch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_messages_recipient_visible
  ON member_messages (recipient_user_id, created_at DESC)
  WHERE member_deleted_at IS NULL;

COMMENT ON TABLE member_messages IS '後台寄給會員的貓頭鷹信件（前台動畫＋開信）';
COMMENT ON COLUMN member_messages.member_deleted_at IS
  '會員從信件匣刪除的時間；非空表示會員端不再顯示，後台仍保留';

ALTER TABLE member_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "會員讀取自己的信件" ON member_messages;
CREATE POLICY "會員讀取自己的信件"
ON member_messages FOR SELECT TO authenticated
USING (auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "後台讀取所有信件" ON member_messages;
CREATE POLICY "後台讀取所有信件"
ON member_messages FOR SELECT TO anon, authenticated
USING (true);

-- 寫入僅透過 SECURITY DEFINER RPC

-- ------------------------------------------------------------
-- 後台：寄給單一會員
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_send_member_message(
  p_user_id UUID,
  p_subject TEXT,
  p_body TEXT,
  p_admin_name TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_body TEXT := trim(COALESCE(p_body, ''));
  v_subject TEXT := trim(COALESCE(p_subject, ''));
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '請指定會員';
  END IF;
  IF v_body = '' THEN
    RAISE EXCEPTION '信件內容不可空白';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM member_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION '找不到此會員';
  END IF;

  INSERT INTO member_messages (
    recipient_user_id, subject, body, sent_by_admin_name, is_broadcast
  )
  VALUES (
    p_user_id,
    v_subject,
    v_body,
    COALESCE(NULLIF(trim(p_admin_name), ''), '後台'),
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------
-- 後台：寄給全體註冊會員（同一 batch_id）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_send_member_message_to_all(
  p_subject TEXT,
  p_body TEXT,
  p_admin_name TEXT DEFAULT ''
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch UUID := gen_random_uuid();
  v_body TEXT := trim(COALESCE(p_body, ''));
  v_subject TEXT := trim(COALESCE(p_subject, ''));
  v_admin TEXT := COALESCE(NULLIF(trim(p_admin_name), ''), '後台');
  v_count INTEGER := 0;
BEGIN
  IF v_body = '' THEN
    RAISE EXCEPTION '信件內容不可空白';
  END IF;

  INSERT INTO member_messages (
    batch_id, recipient_user_id, subject, body, sent_by_admin_name, is_broadcast
  )
  SELECT
    v_batch,
    mp.id,
    v_subject,
    v_body,
    v_admin,
    true
  FROM member_profiles mp;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 後台：寄送紀錄（依批次彙總）
-- 回傳欄位若曾變更，需先 DROP 所有 overload 再 CREATE
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_list_member_message_batches'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.admin_list_member_message_batches(%s)',
      r.args
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION admin_list_member_message_batches(
  p_limit INTEGER DEFAULT 50
)
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
AS $$
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
$$;

-- ------------------------------------------------------------
-- 會員：未讀列表（含已讀近期，最多 20）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION member_list_owl_messages(
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF member_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION member_unread_owl_message_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION member_mark_owl_message_read(p_message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;
  IF p_message_id IS NULL THEN
    RAISE EXCEPTION '請指定信件';
  END IF;

  UPDATE member_messages
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_message_id
    AND recipient_user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION admin_send_member_message(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_send_member_message_to_all(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_list_member_message_batches(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_list_owl_messages(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION member_unread_owl_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION member_mark_owl_message_read(UUID) TO authenticated;
