-- 珠材支援雙屬／多五行（若已執行過舊版 migration-bracelet-configurator.sql 再跑這支）
-- 於 Supabase SQL Editor 執行

ALTER TABLE bracelet_beads
  ADD COLUMN IF NOT EXISTS elements TEXT[] NOT NULL DEFAULT '{}';

-- 舊版單欄 element → elements
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bracelet_beads'
      AND column_name = 'element'
  ) THEN
    UPDATE bracelet_beads
    SET elements = ARRAY[element]::TEXT[]
    WHERE (elements IS NULL OR cardinality(elements) = 0)
      AND element IS NOT NULL
      AND trim(element) <> '';

    ALTER TABLE bracelet_beads DROP COLUMN element;
  END IF;
END $$;

COMMENT ON COLUMN bracelet_beads.elements IS '五行屬性：金木水火土（可多選，雙屬／綜合）';
