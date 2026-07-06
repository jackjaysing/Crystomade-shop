-- 修為 0 常見原因：僅標「已出貨」未標「已付款」→ 未發靈魂卡
-- 與點數／推薦邏輯對齊：已付款 OR 已出貨 即視為可發卡
-- 於 Supabase SQL Editor 執行（可重複執行）

-- ------------------------------------------------------------
-- 1) 發卡條件：已付款或已出貨（排除點數兌換）
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
     OR COALESCE(v_order.is_point_redemption, false) = true
     OR (v_order.is_paid IS NOT TRUE AND v_order.status <> 'shipped') THEN
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

  v_affiliation := COALESCE(NULLIF(trim(v_template.magic_affiliation), ''), '靈動系');

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
-- 2) 觸發：標記已付款或改為已出貨時發卡
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION orders_soul_card_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NOT NULL
       AND NEW.status <> 'cancelled'
       AND COALESCE(NEW.is_point_redemption, false) = false
       AND (NEW.is_paid = true OR NEW.status = 'shipped')
       AND (
         (NEW.is_paid = true AND COALESCE(OLD.is_paid, false) IS DISTINCT FROM true)
         OR (NEW.status = 'shipped' AND COALESCE(OLD.status, '') IS DISTINCT FROM 'shipped')
       ) THEN
      PERFORM issue_crystal_soul_card_for_order(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_soul_card_trigger ON orders;
CREATE TRIGGER orders_soul_card_trigger
  AFTER UPDATE OF is_paid, status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_soul_card_trigger_fn();

-- ------------------------------------------------------------
-- 3) 補發歷史訂單（已付款或已出貨）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION backfill_crystal_soul_cards()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT o.id
    FROM orders o
    LEFT JOIN products p ON p.id = o.product_id
    WHERE o.user_id IS NOT NULL
      AND o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND (o.is_paid = true OR o.status = 'shipped')
      AND NOT EXISTS (
        SELECT 1 FROM crystal_soul_cards c WHERE c.order_id = o.id
      )
      AND (
        o.product_id IS NULL
        OR COALESCE(p.generates_soul_card, true) = true
      )
    ORDER BY o.created_at
  LOOP
    PERFORM issue_crystal_soul_card_for_order(v_order.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 4) 修正代購人（依訂單關聯，避免錯誤 JOIN）
-- ------------------------------------------------------------
UPDATE crystal_soul_cards c
SET purchased_by_user_id = o.user_id
FROM orders o
WHERE c.order_id = o.id
  AND o.user_id IS NOT NULL
  AND (
    c.purchased_by_user_id IS NULL
    OR c.purchased_by_user_id IS DISTINCT FROM o.user_id
  )
  AND c.gifted_from_user_id IS NULL;

UPDATE crystal_soul_cards c
SET purchased_by_user_id = c.gifted_from_user_id
WHERE c.gifted_from_user_id IS NOT NULL
  AND (
    c.purchased_by_user_id IS NULL
    OR c.purchased_by_user_id IS DISTINCT FROM c.gifted_from_user_id
  );

UPDATE crystal_soul_cards
SET purchased_by_user_id = user_id
WHERE purchased_by_user_id IS NULL
  AND user_id IS NOT NULL;

-- ------------------------------------------------------------
-- 5) 立即補發 + 診斷
-- ------------------------------------------------------------
SELECT backfill_crystal_soul_cards() AS new_cards_issued;

-- 有購買紀錄但尚無代購修為的會員（執行後應趨近 0 筆）
SELECT
  mp.id,
  mp.real_name,
  mp.phone,
  COUNT(o.id) FILTER (
    WHERE o.status <> 'cancelled'
      AND COALESCE(o.is_point_redemption, false) = false
      AND (o.is_paid = true OR o.status = 'shipped')
  ) AS eligible_orders,
  COUNT(c.id) FILTER (WHERE c.purchased_by_user_id = mp.id) AS merit_cards
FROM member_profiles mp
LEFT JOIN orders o ON o.user_id = mp.id
LEFT JOIN crystal_soul_cards c ON c.purchased_by_user_id = mp.id
GROUP BY mp.id, mp.real_name, mp.phone
HAVING COUNT(o.id) FILTER (
         WHERE o.status <> 'cancelled'
           AND COALESCE(o.is_point_redemption, false) = false
           AND (o.is_paid = true OR o.status = 'shipped')
       ) > 0
   AND COUNT(c.id) FILTER (WHERE c.purchased_by_user_id = mp.id) = 0
ORDER BY eligible_orders DESC
LIMIT 30;
