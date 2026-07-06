-- 魔法系別：原石系 → 平衡系
-- 於 Supabase SQL Editor 執行（可重複執行）

CREATE OR REPLACE FUNCTION derive_magic_affiliation(p_category TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(trim(p_category), '')
    WHEN '手串' THEN '守護系'
    WHEN '配飾' THEN '增幅系'
    WHEN '擺件' THEN '淨化系'
    WHEN '礦石' THEN '平衡系'
    ELSE '靈動系'
  END;
$$;

UPDATE crystal_soul_cards
SET magic_affiliation = '平衡系'
WHERE magic_affiliation = '原石系';

UPDATE crystal_magic_templates
SET magic_affiliation = '平衡系'
WHERE magic_affiliation = '原石系';
