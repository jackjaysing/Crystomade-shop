-- ============================================================
-- 命理諮詢後台：命理師備註
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE fortune_consultation_requests
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE fortune_consultation_requests
  DROP CONSTRAINT IF EXISTS fortune_consultation_admin_notes_len;

ALTER TABLE fortune_consultation_requests
  ADD CONSTRAINT fortune_consultation_admin_notes_len
  CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 500);

COMMENT ON COLUMN fortune_consultation_requests.admin_notes IS '後台填寫：命理師備註（僅後台可見）';

DROP FUNCTION IF EXISTS update_fortune_consultation_admin(uuid, integer, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS update_fortune_consultation_admin(uuid, integer, boolean, boolean, boolean, text, boolean);

CREATE OR REPLACE FUNCTION update_fortune_consultation_admin(
  p_id uuid,
  p_estimated_fee integer DEFAULT NULL,
  p_update_estimated_fee boolean DEFAULT false,
  p_contacted boolean DEFAULT NULL,
  p_paid boolean DEFAULT NULL,
  p_admin_notes text DEFAULT NULL,
  p_update_admin_notes boolean DEFAULT false
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
    END,
    admin_notes = CASE
      WHEN p_update_admin_notes THEN NULLIF(trim(p_admin_notes), '')
      ELSE admin_notes
    END
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_fortune_consultation_admin(uuid, integer, boolean, boolean, boolean, text, boolean)
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
  paid_at TIMESTAMPTZ,
  admin_notes TEXT
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
    f.paid_at,
    f.admin_notes
  FROM fortune_consultation_requests f
  LEFT JOIN member_profiles mp ON mp.id = f.member_id
  ORDER BY f.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION fetch_all_fortune_consultations_admin() TO anon, authenticated;
