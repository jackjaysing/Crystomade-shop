-- 水晶魔導書：付款後為每件商品發行靈魂卡（crystal_soul_cards）
-- 於 Supabase SQL Editor 執行（可重複執行）
--
-- 若需能量契約／互動任務，請接著執行 migration-grimoire-magic-book.sql
-- 若需後台「是否發行魔法身分證」勾選，請執行 migration-product-generates-soul-card.sql

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS generates_soul_card BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN products.generates_soul_card IS '付款後是否為每件商品發行水晶魔法身分證（魔導書）';

-- ------------------------------------------------------------
-- 商品魔法模板（後台可選填；無則依品類與五行自動推導）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crystal_magic_templates (
  product_id          UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  magic_title         TEXT,
  magic_affiliation   TEXT,
  element_primary     TEXT,
  element_secondary   TEXT,
  chakra              TEXT,
  resonance_keyword   TEXT,
  awakening_verse     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE crystal_magic_templates IS '商品預設魔法屬性；購買付款後快照至靈魂卡';

-- ------------------------------------------------------------
-- 水晶靈魂卡（一筆 order = 一件實體商品）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crystal_soul_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,

  serial_number       TEXT NOT NULL UNIQUE,
  public_slug         TEXT NOT NULL UNIQUE,

  product_name        TEXT NOT NULL,
  product_image_url   TEXT,
  selected_size       TEXT,
  product_category    TEXT,
  five_elements       TEXT[] NOT NULL DEFAULT '{}',
  element_primary     TEXT NOT NULL,
  magic_title         TEXT NOT NULL,
  magic_affiliation   TEXT NOT NULL,
  chakra              TEXT,
  resonance_keyword   TEXT,
  awakening_verse     TEXT,

  magic_status        TEXT NOT NULL DEFAULT 'dormant'
                      CHECK (magic_status IN ('dormant', 'awakening', 'resonating')),
  awakened_at         TIMESTAMPTZ,
  is_public           BOOLEAN NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_user_id
  ON crystal_soul_cards (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crystal_soul_cards_public_slug
  ON crystal_soul_cards (public_slug);

COMMENT ON TABLE crystal_soul_cards IS '會員付款後發行的水晶魔法身分證';
COMMENT ON COLUMN crystal_soul_cards.is_public IS '開啟後，公開連結可供友人唯讀瀏覽';

-- ------------------------------------------------------------
-- 推導魔法系別
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 為單筆已付款訂單發卡（冪等）
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
  v_elements        TEXT[];
  v_primary         TEXT;
  v_title           TEXT;
  v_affiliation     TEXT;
  v_attempts        INTEGER := 0;
  v_has_product     BOOLEAN := false;
BEGIN
  SELECT * INTO v_existing FROM crystal_soul_cards WHERE order_id = p_order_id;
  IF FOUND THEN
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

  INSERT INTO crystal_soul_cards (
    order_id,
    user_id,
    product_id,
    serial_number,
    public_slug,
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
-- 付款後觸發發卡
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
       AND NEW.is_paid = true
       AND COALESCE(OLD.is_paid, false) IS DISTINCT FROM true THEN
      PERFORM issue_crystal_soul_card_for_order(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_soul_card_trigger ON orders;
CREATE TRIGGER orders_soul_card_trigger
  AFTER UPDATE OF is_paid ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_soul_card_trigger_fn();

-- ------------------------------------------------------------
-- 公開頁唯讀查詢（需 is_public = true）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_public_crystal_soul_card(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  serial_number TEXT,
  product_name TEXT,
  product_image_url TEXT,
  selected_size TEXT,
  product_category TEXT,
  five_elements TEXT[],
  element_primary TEXT,
  magic_title TEXT,
  magic_affiliation TEXT,
  chakra TEXT,
  resonance_keyword TEXT,
  awakening_verse TEXT,
  magic_status TEXT,
  awakened_at TIMESTAMPTZ,
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
    c.five_elements,
    c.element_primary,
    c.magic_title,
    c.magic_affiliation,
    c.chakra,
    c.resonance_keyword,
    c.awakening_verse,
    c.magic_status,
    c.awakened_at,
    c.created_at
  FROM crystal_soul_cards c
  WHERE c.public_slug = trim(p_slug)
    AND c.is_public = true;
$$;

-- ------------------------------------------------------------
-- 擁有者：開關分享
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_crystal_soul_card_public(
  p_card_id UUID,
  p_is_public BOOLEAN
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  UPDATE crystal_soul_cards
  SET is_public = COALESCE(p_is_public, false)
  WHERE id = p_card_id
    AND user_id = auth.uid()
  RETURNING * INTO v_card;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到靈魂卡或無權限';
  END IF;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 擁有者：推進覺醒狀態 dormant → awakening → resonating
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION advance_crystal_soul_card_status(p_card_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_next TEXT;
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

  v_next := CASE v_card.magic_status
    WHEN 'dormant' THEN 'awakening'
    WHEN 'awakening' THEN 'resonating'
    ELSE v_card.magic_status
  END;

  IF v_next = v_card.magic_status THEN
    RETURN v_card;
  END IF;

  UPDATE crystal_soul_cards
  SET
    magic_status = v_next,
    awakened_at = CASE
      WHEN v_next IN ('awakening', 'resonating') AND awakened_at IS NULL THEN now()
      ELSE awakened_at
    END
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 補發：已付款但尚未發卡的歷史訂單（可手動執行一次）
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
      AND o.is_paid = true
      AND o.status <> 'cancelled'
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
-- RLS
-- ------------------------------------------------------------
ALTER TABLE crystal_magic_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crystal_soul_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crystal_magic_templates_public_read ON crystal_magic_templates;
CREATE POLICY crystal_magic_templates_public_read
  ON crystal_magic_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS crystal_soul_cards_select_own ON crystal_soul_cards;
CREATE POLICY crystal_soul_cards_select_own
  ON crystal_soul_cards FOR SELECT
  USING (auth.uid() = user_id);

GRANT EXECUTE ON FUNCTION get_public_crystal_soul_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_crystal_soul_card_public(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION advance_crystal_soul_card_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION issue_crystal_soul_card_for_order(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION backfill_crystal_soul_cards() TO service_role;
