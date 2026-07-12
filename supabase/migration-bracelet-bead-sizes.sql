-- 珠材咪數區間（複選）：4-6 / 7-9 / 10-12 / 13+
-- 於 Supabase SQL Editor 執行

ALTER TABLE bracelet_beads
  ADD COLUMN IF NOT EXISTS sizes TEXT[] NOT NULL DEFAULT '{}';

UPDATE bracelet_beads
SET sizes = ARRAY['7-9']::TEXT[]
WHERE sizes IS NULL OR cardinality(sizes) = 0;

COMMENT ON COLUMN bracelet_beads.sizes IS '珠材咪數區間：4-6、7-9、10-12、13+（可複選）';
