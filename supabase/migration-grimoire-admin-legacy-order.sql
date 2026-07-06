-- 後台：為無官網訂單紀錄的會員補登魔導書（建立歷史訂單 + 發行靈魂卡）
-- 於 Supabase → SQL Editor 貼上整份執行（可重複執行）
--
-- 前置（若缺會報錯）：
--   migration-add-crystal-grimoire.sql
--   migration-add-order-number.sql（generate_order_number）
--   migration-grimoire-issue-on-shipped.sql（發卡函式 + 已出貨可發卡）

DROP FUNCTION IF EXISTS admin_issue_legacy_grimoire_orders(
  UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT
);

CREATE OR REPLACE FUNCTION admin_issue_legacy_grimoire_orders(
  p_user_id UUID,
  p_product_id UUID DEFAULT NULL,
  p_product_name TEXT DEFAULT '水晶（線下購入）',
  p_product_image_url TEXT DEFAULT NULL,
  p_selected_size TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  soul_card_id UUID,
  serial_number TEXT,
  activation_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member member_profiles%ROWTYPE;
  v_product products%ROWTYPE;
  v_checkout_id UUID := gen_random_uuid();
  v_order_number TEXT;
  v_qty INTEGER;
  v_i INTEGER;
  v_name TEXT;
  v_image TEXT;
  v_new_order orders%ROWTYPE;
  v_card crystal_soul_cards%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '請指定會員';
  END IF;

  v_qty := GREATEST(1, LEAST(COALESCE(p_quantity, 1), 20));

  SELECT * INTO v_member FROM member_profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到會員';
  END IF;

  v_name := COALESCE(NULLIF(trim(p_product_name), ''), '水晶（線下購入）');
  IF NULLIF(trim(COALESCE(p_note, '')), '') IS NOT NULL THEN
    v_name := v_name || '（' || trim(p_note) || '）';
  END IF;

  v_image := NULLIF(trim(COALESCE(p_product_image_url, '')), '');

  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION '找不到商品';
    END IF;
    IF COALESCE(v_product.generates_soul_card, true) = false THEN
      RAISE EXCEPTION '此商品未開啟發行魔導書';
    END IF;
    v_name := COALESCE(NULLIF(trim(p_product_name), ''), v_product.name);
    v_image := COALESCE(v_image, v_product.image_url);
  END IF;

  v_order_number := 'LEG-' || generate_order_number();

  FOR v_i IN 1..v_qty LOOP
    INSERT INTO orders (
      buyer_name,
      line_name,
      phone,
      cvs_brand,
      cvs_store,
      product_id,
      product_name,
      product_image_url,
      selected_size,
      total_amount,
      status,
      is_paid,
      user_id,
      checkout_id,
      order_number,
      is_point_redemption
    ) VALUES (
      v_member.real_name,
      NULL,
      v_member.phone,
      '7-11',
      '歷史補登',
      p_product_id,
      v_name,
      v_image,
      NULLIF(trim(COALESCE(p_selected_size, '')), ''),
      0,
      'shipped'::order_status,
      true,
      p_user_id,
      v_checkout_id,
      v_order_number,
      false
    )
    RETURNING * INTO v_new_order;

    v_card := issue_crystal_soul_card_for_order(v_new_order.id);

    IF v_card.id IS NULL THEN
      RAISE EXCEPTION '靈魂卡發行失敗（訂單 %）', v_new_order.id;
    END IF;

    order_id := v_new_order.id;
    soul_card_id := v_card.id;
    serial_number := v_card.serial_number;
    activation_slug := v_card.activation_slug;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_issue_legacy_grimoire_orders(
  UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT
) TO anon, authenticated;

COMMENT ON FUNCTION admin_issue_legacy_grimoire_orders IS
  '後台補登線下／官網前購買：建立 LEG- 訂單並發行靈魂卡（不扣庫存、不發點數）';

-- 驗證（應回傳 1 列 function_name = admin_issue_legacy_grimoire_orders）
SELECT routine_name AS function_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'admin_issue_legacy_grimoire_orders';
