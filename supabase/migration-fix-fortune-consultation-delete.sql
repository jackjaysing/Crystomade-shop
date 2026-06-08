-- ============================================================
-- 修正命理諮詢後台刪除：以 SECURITY DEFINER RPC 繞過 RLS 靜默失敗
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

DROP POLICY IF EXISTS "刪除命理諮詢" ON fortune_consultation_requests;
CREATE POLICY "刪除命理諮詢"
  ON fortune_consultation_requests FOR DELETE
  TO anon, authenticated
  USING (true);

DROP FUNCTION IF EXISTS delete_fortune_consultation_admin(uuid);

CREATE OR REPLACE FUNCTION delete_fortune_consultation_admin(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM fortune_consultation_requests WHERE id = p_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_fortune_consultation_admin(uuid) TO anon, authenticated;
