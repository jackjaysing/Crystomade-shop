-- 靈魂卡快照：商品功效類別（tags 中的功效標籤）
-- 於 Supabase SQL Editor 執行（可重複執行）
--
-- 若尚未執行其他 grimoire migration，本檔會一併補齊常用欄位。

-- ------------------------------------------------------------
-- 前置欄位（magic-book / activation-qr / gift-claim / fulfillment）
-- ------------------------------------------------------------
ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS energy_level INTEGER NOT NULL DEFAULT 60;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS contract_signer_name TEXT;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS last_purify_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS last_moon_charge_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS last_meditation_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS activation_slug TEXT UNIQUE;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS gift_claim_slug TEXT UNIQUE;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS gifted_from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS gifted_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS magic_birth_date DATE;

CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_activation_slug
  ON crystal_soul_cards (activation_slug)
  WHERE activation_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_gift_claim_slug
  ON crystal_soul_cards (gift_claim_slug)
  WHERE gift_claim_slug IS NOT NULL;

UPDATE crystal_soul_cards
SET activation_slug = 'act' || replace(gen_random_uuid()::text, '-', '') || substr(md5(id::text), 1, 6)
WHERE activation_slug IS NULL;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS product_tags TEXT[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN crystal_soul_cards.product_tags IS '付款發卡時快照的商品標籤（含功效類別）';

-- 既有卡片：從商品補齊
UPDATE crystal_soul_cards c
SET product_tags = COALESCE(p.tags, '{}')
FROM products p
WHERE c.product_id = p.id
  AND (c.product_tags IS NULL OR c.product_tags = '{}');

-- ------------------------------------------------------------
-- 發卡：快照 product_tags
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
    product_tags,
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
    CASE WHEN v_has_product THEN COALESCE(v_product.tags, '{}') ELSE '{}' END,
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
-- 掃描簽約預覽
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
  product_tags TEXT[],
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
    c.product_tags,
    c.activation_slug
  FROM crystal_soul_cards c
  WHERE c.activation_slug = trim(p_slug)
    AND c.contract_signed_at IS NULL;
$$;

-- ------------------------------------------------------------
-- 贈送頁預覽
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
  product_tags TEXT[],
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
    c.product_tags,
    c.gift_claim_slug
  FROM crystal_soul_cards c
  WHERE c.gift_claim_slug = trim(p_slug)
    AND c.contract_signed_at IS NULL;
$$;

-- ------------------------------------------------------------
-- 公開頁
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_public_crystal_soul_card(TEXT);

CREATE OR REPLACE FUNCTION get_public_crystal_soul_card(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  serial_number TEXT,
  product_name TEXT,
  product_image_url TEXT,
  selected_size TEXT,
  product_category TEXT,
  product_tags TEXT[],
  five_elements TEXT[],
  element_primary TEXT,
  magic_title TEXT,
  magic_affiliation TEXT,
  chakra TEXT,
  resonance_keyword TEXT,
  awakening_verse TEXT,
  magic_status TEXT,
  awakened_at TIMESTAMPTZ,
  energy_level INTEGER,
  contract_signed_at TIMESTAMPTZ,
  contract_signer_name TEXT,
  created_at TIMESTAMPTZ
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
    c.product_category,
    c.product_tags,
    c.five_elements,
    c.element_primary,
    c.magic_title,
    c.magic_affiliation,
    c.chakra,
    c.resonance_keyword,
    c.awakening_verse,
    c.magic_status,
    c.awakened_at,
    c.energy_level,
    c.contract_signed_at,
    c.contract_signer_name,
    c.created_at
  FROM crystal_soul_cards c
  WHERE c.public_slug = trim(p_slug)
    AND c.is_public = true;
$$;

-- ------------------------------------------------------------
-- 後台出貨
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
  product_tags TEXT[],
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
    c.product_tags,
    c.chakra,
    c.resonance_keyword,
    c.product_image_url
  FROM crystal_soul_cards c
  WHERE c.order_id = ANY(p_order_ids)
  ORDER BY c.created_at;
$$;

GRANT EXECUTE ON FUNCTION get_activation_crystal_soul_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_gift_claim_crystal_soul_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_crystal_soul_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_fulfillment_soul_cards(UUID[]) TO anon, authenticated;
