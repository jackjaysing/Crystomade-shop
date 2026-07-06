-- 後台出貨：量身訂製手串可編輯魔法物名稱（每條獨一無二）
-- 於 Supabase SQL Editor 執行（可重複執行）

DROP FUNCTION IF EXISTS set_fulfillment_soul_card_profile(UUID, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS set_fulfillment_soul_card_profile(UUID, TEXT, TEXT, TEXT[], TEXT);

CREATE OR REPLACE FUNCTION set_fulfillment_soul_card_profile(
  p_card_id UUID,
  p_element_primary TEXT,
  p_magic_affiliation TEXT,
  p_product_tags TEXT[] DEFAULT '{}',
  p_magic_title TEXT DEFAULT NULL
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_primary TEXT;
  v_affiliation TEXT;
  v_tags TEXT[];
  v_elements TEXT[];
  v_title TEXT;
BEGIN
  IF p_card_id IS NULL THEN
    RAISE EXCEPTION '無效的靈魂卡 ID';
  END IF;

  v_primary := trim(COALESCE(p_element_primary, ''));
  IF v_primary NOT IN ('金', '木', '水', '火', '土') THEN
    RAISE EXCEPTION '主屬性須為金、木、水、火、土其中之一';
  END IF;

  v_affiliation := trim(COALESCE(p_magic_affiliation, ''));
  IF v_affiliation = '' THEN
    RAISE EXCEPTION '請填寫魔法系別';
  END IF;

  v_tags := COALESCE(p_product_tags, '{}');

  IF p_magic_title IS NOT NULL THEN
    v_title := trim(p_magic_title);
    IF v_title = '' THEN
      RAISE EXCEPTION '請填寫手串名稱';
    END IF;
  END IF;

  SELECT * INTO v_card FROM crystal_soul_cards WHERE id = p_card_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到靈魂卡';
  END IF;

  v_elements := COALESCE(v_card.five_elements, '{}');
  IF NOT (v_primary = ANY(v_elements)) THEN
    v_elements := array_append(v_elements, v_primary);
  END IF;

  UPDATE crystal_soul_cards
  SET
    element_primary = v_primary,
    magic_affiliation = v_affiliation,
    product_tags = v_tags,
    five_elements = v_elements,
    magic_title = COALESCE(v_title, magic_title)
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

GRANT EXECUTE ON FUNCTION set_fulfillment_soul_card_profile(UUID, TEXT, TEXT, TEXT[], TEXT) TO anon, authenticated;
