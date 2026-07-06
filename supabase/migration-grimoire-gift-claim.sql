-- 魔導書贈送：代購者可分享契約連結，由朋友簽署後轉入朋友帳戶
-- 於 Supabase SQL Editor 執行（可重複執行）

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS gift_claim_slug TEXT UNIQUE;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS gifted_from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS gifted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_gift_claim_slug
  ON crystal_soul_cards (gift_claim_slug)
  WHERE gift_claim_slug IS NOT NULL;

COMMENT ON COLUMN crystal_soul_cards.gift_claim_slug IS '贈送契約連結 slug；未簽約前可由原持有人產生';
COMMENT ON COLUMN crystal_soul_cards.gifted_from_user_id IS '代購轉贈前的原持有人';

-- ------------------------------------------------------------
-- 原持有人：產生贈送契約連結
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enable_crystal_soul_card_gift_claim(p_card_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_slug TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  SELECT * INTO v_card
  FROM crystal_soul_cards
  WHERE id = p_card_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到靈魂卡或無權限';
  END IF;

  IF v_card.contract_signed_at IS NOT NULL THEN
    RAISE EXCEPTION '已簽署契約，無法再轉贈';
  END IF;

  v_slug := COALESCE(
    v_card.gift_claim_slug,
    'gift' || replace(gen_random_uuid()::text, '-', '') || substr(md5(random()::text), 1, 6)
  );

  UPDATE crystal_soul_cards
  SET gift_claim_slug = v_slug
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 贈送頁預覽（未登入可讀）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_gift_claim_crystal_soul_card(TEXT);

CREATE OR REPLACE FUNCTION get_gift_claim_crystal_soul_card(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  serial_number TEXT,
  product_name TEXT,
  product_image_url TEXT,
  selected_size TEXT,
  magic_title TEXT,
  element_primary TEXT,
  magic_affiliation TEXT,
  five_elements TEXT[],
  gift_claim_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.serial_number,
    c.product_name,
    c.product_image_url,
    c.selected_size,
    c.magic_title,
    c.element_primary,
    c.magic_affiliation,
    c.five_elements,
    c.gift_claim_slug
  FROM crystal_soul_cards c
  WHERE c.gift_claim_slug = trim(p_slug)
    AND c.contract_signed_at IS NULL;
$$;

-- ------------------------------------------------------------
-- 朋友：簽署契約並接手魔導書
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_crystal_soul_card_gift(
  p_slug TEXT,
  p_signer_name TEXT DEFAULT NULL
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_name TEXT;
  v_from_user UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入會員後再簽署契約';
  END IF;

  SELECT * INTO v_card
  FROM crystal_soul_cards
  WHERE gift_claim_slug = trim(p_slug)
    AND contract_signed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '贈送連結已失效或契約已完成';
  END IF;

  IF v_card.user_id = auth.uid() THEN
    RAISE EXCEPTION '請將連結傳給受贈的朋友簽署；代購者請自行簽署或請朋友以其帳號開啟此連結';
  END IF;

  v_name := NULLIF(trim(COALESCE(p_signer_name, '')), '');
  v_from_user := v_card.user_id;

  UPDATE crystal_soul_cards
  SET
    user_id = auth.uid(),
    gifted_from_user_id = v_from_user,
    gifted_at = now(),
    contract_signed_at = now(),
    contract_signer_name = v_name,
    energy_level = LEAST(100, GREATEST(energy_level, 70)),
    gift_claim_slug = NULL,
    is_public = false
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

GRANT EXECUTE ON FUNCTION enable_crystal_soul_card_gift_claim(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gift_claim_crystal_soul_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_crystal_soul_card_gift(TEXT, TEXT) TO authenticated;
