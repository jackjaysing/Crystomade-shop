-- 隨貨 QR：購買人掃描進入魔法身分證簽約頁
-- 於 Supabase SQL Editor 執行（可重複執行）

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS activation_slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_activation_slug
  ON crystal_soul_cards (activation_slug)
  WHERE activation_slug IS NOT NULL;

COMMENT ON COLUMN crystal_soul_cards.activation_slug IS '隨貨 QR 專用；購買人掃描簽署能量契約';

-- 補齊既有靈魂卡的 activation_slug
UPDATE crystal_soul_cards
SET activation_slug = 'act' || replace(gen_random_uuid()::text, '-', '') || substr(md5(id::text), 1, 6)
WHERE activation_slug IS NULL;

-- ------------------------------------------------------------
-- 發卡時一併產生 activation_slug
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION issue_crystal_soul_card_for_order(p_order_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           orders%ROWTYPE;
  v_product         products%ROWTYPE;
  v_template        crystal_magic_templates%ROWTYPE;
  v_existing        crystal_soul_cards%ROWTYPE;
  v_card            crystal_soul_cards%ROWTYPE;
  v_serial          TEXT;
  v_slug            TEXT;
  v_activation      TEXT;
  v_elements        TEXT[];
  v_primary         TEXT;
  v_title           TEXT;
  v_affiliation     TEXT;
  v_attempts        INTEGER := 0;
  v_has_product     BOOLEAN := false;
BEGIN
  SELECT * INTO v_existing FROM crystal_soul_cards WHERE order_id = p_order_id;
  IF FOUND THEN
    IF v_existing.activation_slug IS NULL THEN
      v_activation := 'act' || replace(gen_random_uuid()::text, '-', '') || substr(md5(v_existing.id::text), 1, 6);
      UPDATE crystal_soul_cards
      SET activation_slug = v_activation
      WHERE id = v_existing.id
      RETURNING * INTO v_existing;
    END IF;
    RETURN v_existing;
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.user_id IS NULL
     OR v_order.is_paid IS NOT TRUE
     OR v_order.status = 'cancelled' THEN
    RETURN NULL;
  END IF;

  IF v_order.product_id IS NOT NULL THEN
    SELECT * INTO v_product FROM products WHERE id = v_order.product_id;
    IF FOUND THEN
      v_has_product := true;
      IF COALESCE(v_product.generates_soul_card, true) = false THEN
        RETURN NULL;
      END IF;
      SELECT * INTO v_template FROM crystal_magic_templates WHERE product_id = v_order.product_id;
    END IF;
  END IF;

  v_elements := CASE WHEN v_has_product THEN COALESCE(v_product.five_elements, '{}') ELSE '{}' END;
  IF array_length(v_elements, 1) IS NULL OR array_length(v_elements, 1) = 0 THEN
    v_elements := ARRAY['土'];
  END IF;

  v_primary := COALESCE(
    NULLIF(trim(v_template.element_primary), ''),
    v_elements[1],
    '土'
  );

  v_title := COALESCE(
    NULLIF(trim(v_template.magic_title), ''),
    NULLIF(trim(v_order.product_name), ''),
    '水晶靈魂'
  );

  v_affiliation := COALESCE(
    NULLIF(trim(v_template.magic_affiliation), ''),
    CASE WHEN v_has_product THEN derive_magic_affiliation(COALESCE(v_product.category::text, '')) ELSE '靈動系' END
  );

  LOOP
    v_attempts := v_attempts + 1;
    v_serial := 'CM-' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(md5(random()::text || clock_timestamp()::text || p_order_id::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM crystal_soul_cards WHERE serial_number = v_serial);
    EXIT WHEN v_attempts > 20;
  END LOOP;

  v_slug := replace(gen_random_uuid()::text, '-', '') || substr(md5(random()::text), 1, 8);
  v_activation := 'act' || replace(gen_random_uuid()::text, '-', '') || substr(md5(random()::text), 1, 6);

  INSERT INTO crystal_soul_cards (
    order_id,
    user_id,
    product_id,
    serial_number,
    public_slug,
    activation_slug,
    product_name,
    product_image_url,
    selected_size,
    product_category,
    five_elements,
    element_primary,
    magic_title,
    magic_affiliation,
    chakra,
    resonance_keyword,
    awakening_verse
  ) VALUES (
    v_order.id,
    v_order.user_id,
    v_order.product_id,
    v_serial,
    v_slug,
    v_activation,
    COALESCE(NULLIF(trim(v_order.product_name), ''), v_title),
    v_order.product_image_url,
    v_order.selected_size,
    CASE WHEN v_has_product THEN v_product.category::text ELSE NULL END,
    v_elements,
    v_primary,
    v_title,
    v_affiliation,
    NULLIF(trim(v_template.chakra), ''),
    NULLIF(trim(v_template.resonance_keyword), ''),
    NULLIF(trim(v_template.awakening_verse), '')
  )
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 掃描頁預覽（未簽約、未登入可讀）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_activation_crystal_soul_card(TEXT);

CREATE OR REPLACE FUNCTION get_activation_crystal_soul_card(p_slug TEXT)
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
  activation_slug TEXT
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
    c.activation_slug
  FROM crystal_soul_cards c
  WHERE c.activation_slug = trim(p_slug)
    AND c.contract_signed_at IS NULL;
$$;

-- ------------------------------------------------------------
-- 購買人掃描 QR 簽署；非購買人掃描則視同接手（轉贈）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION activation_crystal_soul_card_role(p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_owner UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anonymous';
  END IF;

  SELECT user_id INTO v_owner
  FROM crystal_soul_cards
  WHERE activation_slug = trim(p_slug)
    AND contract_signed_at IS NULL;

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  IF v_owner = auth.uid() THEN
    RETURN 'owner';
  END IF;

  RETURN 'recipient';
END;
$$;

CREATE OR REPLACE FUNCTION sign_crystal_energy_contract_by_activation(
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
    RAISE EXCEPTION '請先登入';
  END IF;

  SELECT * INTO v_card
  FROM crystal_soul_cards
  WHERE activation_slug = trim(p_slug)
    AND contract_signed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '簽約連結已失效，或契約已完成簽署';
  END IF;

  v_name := NULLIF(trim(COALESCE(p_signer_name, '')), '');

  IF v_card.user_id = auth.uid() THEN
    UPDATE crystal_soul_cards
    SET
      contract_signed_at = COALESCE(contract_signed_at, now()),
      contract_signer_name = COALESCE(contract_signer_name, v_name),
      energy_level = LEAST(100, GREATEST(energy_level, 70))
    WHERE id = v_card.id
    RETURNING * INTO v_card;

    RETURN v_card;
  END IF;

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

-- ------------------------------------------------------------
-- 後台出貨：依訂單查靈魂卡與 QR 網址用 slug
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

GRANT EXECUTE ON FUNCTION get_activation_crystal_soul_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activation_crystal_soul_card_role(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sign_crystal_energy_contract_by_activation(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fulfillment_soul_cards(UUID[]) TO anon, authenticated;
