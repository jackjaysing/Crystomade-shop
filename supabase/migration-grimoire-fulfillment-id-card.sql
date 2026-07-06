-- 後台出貨：魔法身分證實體卡內容（出生日期由後台填寫）
-- 於 Supabase SQL Editor 執行（可重複執行）

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS magic_birth_date DATE;

COMMENT ON COLUMN crystal_soul_cards.magic_birth_date IS '魔法身分證出生／印記日期，後台出貨時填寫';

-- ------------------------------------------------------------
-- 後台：更新出生日期
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_fulfillment_soul_card_birth_date(
  p_card_id UUID,
  p_birth_date DATE
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  IF p_card_id IS NULL THEN
    RAISE EXCEPTION '無效的靈魂卡 ID';
  END IF;

  UPDATE crystal_soul_cards
  SET magic_birth_date = p_birth_date
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到靈魂卡';
  END IF;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 後台出貨：擴充靈魂卡欄位（身分證列印用）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_fulfillment_soul_cards(UUID[]);

CREATE OR REPLACE FUNCTION get_fulfillment_soul_cards(p_order_ids UUID[])
RETURNS TABLE (
  order_id UUID,
  id UUID,
  serial_number TEXT,
  activation_slug TEXT,
  magic_title TEXT,
  product_name TEXT,
  selected_size TEXT,
  contract_signed_at TIMESTAMPTZ,
  magic_birth_date DATE,
  element_primary TEXT,
  magic_affiliation TEXT,
  five_elements TEXT[],
  chakra TEXT,
  resonance_keyword TEXT,
  product_image_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.order_id,
    c.id,
    c.serial_number,
    c.activation_slug,
    c.magic_title,
    c.product_name,
    c.selected_size,
    c.contract_signed_at,
    c.magic_birth_date,
    c.element_primary,
    c.magic_affiliation,
    c.five_elements,
    c.chakra,
    c.resonance_keyword,
    c.product_image_url
  FROM crystal_soul_cards c
  WHERE c.order_id = ANY(p_order_ids)
  ORDER BY c.created_at;
$$;

GRANT EXECUTE ON FUNCTION set_fulfillment_soul_card_birth_date(UUID, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_fulfillment_soul_cards(UUID[]) TO anon, authenticated;
