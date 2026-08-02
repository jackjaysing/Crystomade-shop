-- 水晶魔法身分證：出貨後才對會員發放
-- - 付款後：後台可先準備／編輯身分證（功效類別等）
-- - 出貨時：released_to_member = true，會員書架才看得到
-- 於 Supabase SQL Editor 執行（可重複執行）

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS released_to_member BOOLEAN;

COMMENT ON COLUMN crystal_soul_cards.released_to_member IS
  '是否已對會員發放（出貨後為 true；付款後準備中為 false）';

-- 既有資料：已出貨視為已發放；其餘先不對會員顯示
UPDATE crystal_soul_cards c
SET released_to_member = COALESCE(
  (
    SELECT o.status = 'shipped'
    FROM orders o
    WHERE o.id = c.order_id
  ),
  false
)
WHERE released_to_member IS NULL;

ALTER TABLE crystal_soul_cards
  ALTER COLUMN released_to_member SET DEFAULT false;

UPDATE crystal_soul_cards
SET released_to_member = false
WHERE released_to_member IS NULL;

ALTER TABLE crystal_soul_cards
  ALTER COLUMN released_to_member SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_released_to_member
  ON crystal_soul_cards (user_id, released_to_member)
  WHERE released_to_member = true;

-- ------------------------------------------------------------
-- 內部：建立／補齊靈魂卡（不負責發放開關）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_crystal_soul_card_for_order_if_needed(p_order_id UUID)
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
    IF v_existing.purchased_by_user_id IS NULL AND v_existing.user_id IS NOT NULL THEN
      UPDATE crystal_soul_cards
      SET purchased_by_user_id = COALESCE(
        (SELECT user_id FROM orders WHERE id = v_existing.order_id),
        v_existing.user_id
      )
      WHERE id = v_existing.id
      RETURNING * INTO v_existing;
    END IF;
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
     OR v_order.status = 'cancelled'
     OR COALESCE(v_order.is_point_redemption, false) = true THEN
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
    CASE
      WHEN v_has_product THEN derive_magic_affiliation(COALESCE(v_product.category::text, ''))
      ELSE '靈動系'
    END
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
    purchased_by_user_id,
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
    awakening_verse,
    released_to_member
  ) VALUES (
    v_order.id,
    v_order.user_id,
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
    NULLIF(trim(v_template.awakening_verse), ''),
    false
  )
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- 出貨發放：建立（若尚無）並對會員開放
CREATE OR REPLACE FUNCTION issue_crystal_soul_card_for_order(p_order_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.status <> 'shipped'
     OR v_order.user_id IS NULL
     OR COALESCE(v_order.is_point_redemption, false) = true THEN
    RETURN NULL;
  END IF;

  v_card := create_crystal_soul_card_for_order_if_needed(p_order_id);
  IF v_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE crystal_soul_cards
  SET released_to_member = true
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- 後台準備：已付款即可建立（尚未對會員發放）
CREATE OR REPLACE FUNCTION ensure_fulfillment_soul_card_for_order(p_order_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.user_id IS NULL
     OR v_order.status = 'cancelled'
     OR COALESCE(v_order.is_point_redemption, false) = true
     OR (v_order.is_paid IS NOT TRUE AND v_order.status <> 'shipped') THEN
    RETURN NULL;
  END IF;

  v_card := create_crystal_soul_card_for_order_if_needed(p_order_id);
  IF v_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 若訂單已出貨，一併發放
  IF v_order.status = 'shipped' AND NOT COALESCE(v_card.released_to_member, false) THEN
    UPDATE crystal_soul_cards
    SET released_to_member = true
    WHERE id = v_card.id
    RETURNING * INTO v_card;
  END IF;

  RETURN v_card;
END;
$$;

-- 觸發：僅在改為已出貨時發放
CREATE OR REPLACE FUNCTION orders_soul_card_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NOT NULL
       AND COALESCE(NEW.is_point_redemption, false) = false
       AND NEW.status = 'shipped'::order_status
       AND OLD.status IS DISTINCT FROM 'shipped'::order_status THEN
      PERFORM issue_crystal_soul_card_for_order(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_soul_card_trigger ON orders;
CREATE TRIGGER orders_soul_card_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_soul_card_trigger_fn();

-- 後台：一次確保多筆訂單的準備用靈魂卡
CREATE OR REPLACE FUNCTION ensure_fulfillment_soul_cards(p_order_ids UUID[])
RETURNS SETOF crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  IF p_order_ids IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_id IN ARRAY p_order_ids
  LOOP
    v_card := ensure_fulfillment_soul_card_for_order(v_id);
    IF v_card.id IS NOT NULL THEN
      RETURN NEXT v_card;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION issue_crystal_soul_card_for_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_fulfillment_soul_card_for_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_fulfillment_soul_cards(UUID[]) TO authenticated;
