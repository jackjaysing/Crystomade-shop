-- ============================================================
-- 命理諮詢：客戶填寫問題與 Line ID · 僅後台查看
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS fortune_consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  line_id TEXT NOT NULL,
  display_name TEXT,
  member_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  estimated_fee INTEGER,
  contacted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fortune_consultation_question_len
    CHECK (char_length(trim(question)) BETWEEN 1 AND 500),
  CONSTRAINT fortune_consultation_line_id_len
    CHECK (char_length(trim(line_id)) BETWEEN 1 AND 50),
  CONSTRAINT fortune_consultation_display_name_len
    CHECK (display_name IS NULL OR char_length(trim(display_name)) BETWEEN 1 AND 30),
  CONSTRAINT fortune_consultation_estimated_fee_nonneg
    CHECK (estimated_fee IS NULL OR estimated_fee >= 0)
);

COMMENT ON TABLE fortune_consultation_requests IS '命理諮詢留言（含 Line ID，僅後台查看）';

CREATE INDEX IF NOT EXISTS idx_fortune_consultation_created
  ON fortune_consultation_requests (created_at DESC);

ALTER TABLE fortune_consultation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "提交命理諮詢" ON fortune_consultation_requests;
CREATE POLICY "提交命理諮詢"
  ON fortune_consultation_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(question)) BETWEEN 1 AND 500
    AND char_length(trim(line_id)) BETWEEN 1 AND 50
    AND (
      display_name IS NULL
      OR char_length(trim(display_name)) BETWEEN 1 AND 30
    )
    AND (
      member_id IS NULL
      OR member_id = auth.uid()
    )
  );

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

DROP FUNCTION IF EXISTS update_fortune_consultation_admin(uuid, integer, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION update_fortune_consultation_admin(
  p_id uuid,
  p_estimated_fee integer DEFAULT NULL,
  p_update_estimated_fee boolean DEFAULT false,
  p_contacted boolean DEFAULT NULL,
  p_paid boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE fortune_consultation_requests
  SET
    estimated_fee = CASE
      WHEN p_update_estimated_fee THEN p_estimated_fee
      ELSE estimated_fee
    END,
    contacted_at = CASE
      WHEN p_contacted IS TRUE THEN now()
      WHEN p_contacted IS FALSE THEN NULL
      ELSE contacted_at
    END,
    paid_at = CASE
      WHEN p_paid IS TRUE THEN now()
      WHEN p_paid IS FALSE THEN NULL
      ELSE paid_at
    END
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_fortune_consultation_admin(uuid, integer, boolean, boolean, boolean)
  TO anon, authenticated;

DROP FUNCTION IF EXISTS fetch_all_fortune_consultations_admin();

CREATE OR REPLACE FUNCTION fetch_all_fortune_consultations_admin()
RETURNS TABLE (
  id UUID,
  question TEXT,
  line_id TEXT,
  display_name TEXT,
  member_id UUID,
  created_at TIMESTAMPTZ,
  member_phone TEXT,
  member_real_name TEXT,
  estimated_fee INTEGER,
  contacted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.question,
    f.line_id,
    f.display_name,
    f.member_id,
    f.created_at,
    mp.phone AS member_phone,
    mp.real_name AS member_real_name,
    f.estimated_fee,
    f.contacted_at,
    f.paid_at
  FROM fortune_consultation_requests f
  LEFT JOIN member_profiles mp ON mp.id = f.member_id
  ORDER BY f.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION fetch_all_fortune_consultations_admin() TO anon, authenticated;
