-- 商品可設定是否於付款後發行水晶魔法身分證
-- 於 Supabase SQL Editor 執行（可重複執行）
--
-- 【執行順序】若尚未建立魔導書，請依序執行：
--   1. migration-add-crystal-grimoire.sql   ← 建立 crystal_soul_cards（必須先跑）
--   2. migration-grimoire-magic-book.sql   ← 能量契約／互動任務（選用）
--   3. 本檔案（步驟 1 可單獨執行；步驟 2 需步驟 1 完成後）

-- ------------------------------------------------------------
-- 步驟 1：後台勾選欄位（隨時可執行，不依賴 crystal_soul_cards）
-- ------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS generates_soul_card BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN products.generates_soul_card IS '付款後是否為每件商品發行水晶魔法身分證（魔導書）';

-- ------------------------------------------------------------
-- 步驟 2：更新發卡函式（需已執行 migration-add-crystal-grimoire.sql）
-- ------------------------------------------------------------
DO $patch$
BEGIN
  IF to_regclass('public.crystal_soul_cards') IS NULL THEN
    RAISE NOTICE '已新增 products.generates_soul_card。請先執行 migration-add-crystal-grimoire.sql，再重新執行本檔案以更新發卡函式。';
    RETURN;
  END IF;

  EXECUTE $issue$
CREATE OR REPLACE FUNCTION issue_crystal_soul_card_for_order(p_order_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
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
$body$;
  $issue$;

  EXECUTE $backfill$
CREATE OR REPLACE FUNCTION backfill_crystal_soul_cards()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
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
$body$;
  $backfill$;

  RAISE NOTICE '已更新發卡函式（尊重 generates_soul_card 設定）。';
END $patch$;
