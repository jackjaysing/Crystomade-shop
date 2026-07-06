-- 代購修為：購買人保留部分修為；簽約後修行修為歸當前擁有者
-- 於 Supabase SQL Editor 執行（可重複執行）

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS purchased_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_purchased_by
  ON crystal_soul_cards (purchased_by_user_id)
  WHERE purchased_by_user_id IS NOT NULL;

COMMENT ON COLUMN crystal_soul_cards.purchased_by_user_id IS '下單購買人；轉贈後不變，用於購入部分修為';

-- 既有資料：依訂單／轉贈來源回填購買人（避免錯誤 JOIN 全表 orders）
UPDATE crystal_soul_cards c
SET purchased_by_user_id = o.user_id
FROM orders o
WHERE c.order_id = o.id
  AND o.user_id IS NOT NULL
  AND c.purchased_by_user_id IS NULL;

UPDATE crystal_soul_cards c
SET purchased_by_user_id = c.gifted_from_user_id
WHERE c.purchased_by_user_id IS NULL
  AND c.gifted_from_user_id IS NOT NULL;

UPDATE crystal_soul_cards
SET purchased_by_user_id = user_id
WHERE purchased_by_user_id IS NULL;

-- ------------------------------------------------------------
-- 發卡：記錄購買人
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
-- 會員：代購修為本數（含已轉贈；須與訂單購買人一致）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION grimoire_eligible_purchase_merit_card_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM crystal_soul_cards c
  INNER JOIN orders o ON o.id = c.order_id
  LEFT JOIN products p ON p.id = o.product_id
  WHERE p_user_id IS NOT NULL
    AND c.purchased_by_user_id = p_user_id
    AND o.user_id = p_user_id
    AND o.status <> 'cancelled'
    AND COALESCE(o.is_point_redemption, false) = false
    AND (o.is_paid = true OR o.status = 'shipped')
    AND (
      o.product_id IS NULL
      OR COALESCE(p.generates_soul_card, true) = true
    );
$$;

CREATE OR REPLACE FUNCTION count_grimoire_purchase_merit_cards(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '無權限查詢其他會員的購入修為';
  END IF;

  RETURN grimoire_eligible_purchase_merit_card_count(p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION grimoire_eligible_purchase_merit_card_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_grimoire_purchase_merit_cards(UUID) TO anon, authenticated;

-- ------------------------------------------------------------
-- 修為計算（與前端一致：購買 +15／本；擁有者修行里程碑）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION soul_card_owner_cultivation_xp(p_card crystal_soul_cards)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_xp INTEGER := 0;
  v_status_tier INTEGER;
BEGIN
  IF p_card.contract_signed_at IS NULL THEN
    RETURN 0;
  END IF;

  v_xp := 30;
  v_xp := v_xp + floor(p_card.energy_level * 0.4)::INTEGER;
  v_status_tier := crystal_magic_status_tier(p_card.magic_status);

  IF v_status_tier >= 2 THEN v_xp := v_xp + 25; END IF;
  IF v_status_tier >= 3 THEN v_xp := v_xp + 35; END IF;
  IF v_status_tier >= 4 THEN v_xp := v_xp + 45; END IF;
  IF v_status_tier >= 5 THEN v_xp := v_xp + 55; END IF;

  IF p_card.last_purify_at IS NOT NULL THEN v_xp := v_xp + 8; END IF;
  IF p_card.last_moon_charge_at IS NOT NULL THEN v_xp := v_xp + 8; END IF;
  IF p_card.last_meditation_at IS NOT NULL THEN v_xp := v_xp + 12; END IF;
  IF COALESCE(p_card.is_public, false) THEN v_xp := v_xp + 10; END IF;

  RETURN v_xp;
END;
$$;

CREATE OR REPLACE FUNCTION member_magician_total_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT COALESCE(mp.grimoire_merit_xp, 0)
      + grimoire_eligible_purchase_merit_card_count(p_user_id) * 15
      + COALESCE((
        SELECT SUM(soul_card_owner_cultivation_xp(c))
        FROM crystal_soul_cards c
        WHERE c.user_id = p_user_id
      ), 0)
    FROM member_profiles mp
    WHERE mp.id = p_user_id
  ), 0);
$$;

-- 後台 RPC：補上 purchased_by_user_id（回傳欄位變更須先 DROP）
DROP FUNCTION IF EXISTS admin_fetch_magician_soul_cards();

CREATE OR REPLACE FUNCTION admin_fetch_magician_soul_cards()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  purchased_by_user_id UUID,
  contract_signed_at TIMESTAMPTZ,
  magic_status TEXT,
  energy_level INTEGER,
  is_public BOOLEAN,
  last_purify_at TIMESTAMPTZ,
  last_moon_charge_at TIMESTAMPTZ,
  last_meditation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.user_id,
    c.purchased_by_user_id,
    c.contract_signed_at,
    c.magic_status,
    c.energy_level,
    c.is_public,
    c.last_purify_at,
    c.last_moon_charge_at,
    c.last_meditation_at,
    c.created_at
  FROM crystal_soul_cards c
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION admin_fetch_magician_soul_cards() TO anon, authenticated;

-- 後台：各會員代購修為本數（與 count_grimoire_purchase_merit_cards 一致）
CREATE OR REPLACE FUNCTION admin_fetch_purchase_merit_counts()
RETURNS TABLE (
  user_id UUID,
  card_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.user_id,
    COUNT(*)::INTEGER AS card_count
  FROM crystal_soul_cards c
  INNER JOIN orders o ON o.id = c.order_id
  LEFT JOIN products p ON p.id = o.product_id
  WHERE o.user_id IS NOT NULL
    AND c.purchased_by_user_id = o.user_id
    AND o.status <> 'cancelled'
    AND COALESCE(o.is_point_redemption, false) = false
    AND (o.is_paid = true OR o.status = 'shipped')
    AND (
      o.product_id IS NULL
      OR COALESCE(p.generates_soul_card, true) = true
    )
  GROUP BY o.user_id;
$$;

GRANT EXECUTE ON FUNCTION admin_fetch_purchase_merit_counts() TO anon, authenticated;

-- soul_card_magician_xp 改為擁有者修行（免運 RPC 相容舊名）
CREATE OR REPLACE FUNCTION soul_card_magician_xp(p_card crystal_soul_cards)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT soul_card_owner_cultivation_xp(p_card);
$$;
