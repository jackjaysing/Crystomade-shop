-- ============================================================
-- 許願留言板簡化：移除審核流程，改為僅會員可許願、後台查看
-- 若已執行過舊版 migration-add-wish-board.sql，請再執行本檔
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

DELETE FROM wish_messages WHERE member_id IS NULL;

ALTER TABLE wish_messages DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE wish_messages DROP COLUMN IF EXISTS status;

ALTER TABLE wish_messages ALTER COLUMN member_id SET NOT NULL;
ALTER TABLE wish_messages ALTER COLUMN display_name SET NOT NULL;

DROP INDEX IF EXISTS idx_wish_messages_status_created;
CREATE INDEX IF NOT EXISTS idx_wish_messages_created
  ON wish_messages (created_at DESC);

COMMENT ON TABLE wish_messages IS '會員許願留言（僅後台查看）';

ALTER TABLE wish_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公開讀取已審核許願" ON wish_messages;
DROP POLICY IF EXISTS "公開提交許願" ON wish_messages;
DROP POLICY IF EXISTS "更新許願" ON wish_messages;

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
