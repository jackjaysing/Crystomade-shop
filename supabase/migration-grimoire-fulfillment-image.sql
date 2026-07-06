-- 後台出貨：替換靈魂卡／身分證照片
-- 於 Supabase SQL Editor 執行（可重複執行）

CREATE OR REPLACE FUNCTION set_fulfillment_soul_card_image(
  p_card_id UUID,
  p_image_url TEXT
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_url TEXT;
BEGIN
  IF p_card_id IS NULL THEN
    RAISE EXCEPTION '無效的靈魂卡 ID';
  END IF;

  v_url := NULLIF(trim(COALESCE(p_image_url, '')), '');

  UPDATE crystal_soul_cards
  SET product_image_url = v_url
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到靈魂卡';
  END IF;

  RETURN v_card;
END;
$$;

GRANT EXECUTE ON FUNCTION set_fulfillment_soul_card_image(UUID, TEXT) TO anon, authenticated;
