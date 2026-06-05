-- ============================================================
-- 許願留言板：會員許願 · 僅後台查看
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS wish_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  display_name TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wish_messages_content_len CHECK (char_length(trim(content)) BETWEEN 1 AND 500),
  CONSTRAINT wish_messages_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 30)
);

COMMENT ON TABLE wish_messages IS '會員許願留言（僅後台查看）';

CREATE INDEX IF NOT EXISTS idx_wish_messages_created
  ON wish_messages (created_at DESC);

ALTER TABLE wish_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "會員提交許願" ON wish_messages;
CREATE POLICY "會員提交許願"
  ON wish_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND char_length(trim(content)) BETWEEN 1 AND 500
    AND char_length(display_name) BETWEEN 1 AND 30
  );

DROP POLICY IF EXISTS "刪除許願" ON wish_messages;
CREATE POLICY "刪除許願"
  ON wish_messages FOR DELETE
  USING (true);

-- 後台（anon 金鑰）讀取全部留言（含會員電話）
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
