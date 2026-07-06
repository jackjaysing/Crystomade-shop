-- 補發：已付款歷史訂單的魔法身分證 + QR + 功效標籤
-- 於 Supabase SQL Editor 執行（可重複執行）
--
-- 前置：請先跑完 grimoire 相關 migration（至少 add-crystal-grimoire、magic-book、activation-qr、product-tags）
--
-- 補發規則：
--   ✓ 已付款、未取消、有會員帳號
--   ✓ 該訂單尚未有靈魂卡
--   ✓ 商品未關閉「發行魔法身分證」
--   ✗ 無會員帳號的訂單無法發卡（user_id 為 NULL）

-- 1) 為符合條件的訂單發行靈魂卡（含 activation_slug、product_tags）
SELECT backfill_crystal_soul_cards() AS new_cards_issued;

-- 2) 既有靈魂卡但缺少 QR slug 的，補上
UPDATE crystal_soul_cards
SET activation_slug = 'act' || replace(gen_random_uuid()::text, '-', '') || substr(md5(id::text), 1, 6)
WHERE activation_slug IS NULL;

-- 3) 既有靈魂卡：從商品補齊功效標籤快照
UPDATE crystal_soul_cards c
SET product_tags = COALESCE(p.tags, '{}')
FROM products p
WHERE c.product_id = p.id
  AND (c.product_tags IS NULL OR c.product_tags = '{}');

-- 4) 檢視結果（可選）
SELECT
  o.id AS order_id,
  o.product_name,
  o.is_paid,
  o.status,
  c.id AS soul_card_id,
  c.serial_number,
  c.activation_slug IS NOT NULL AS has_qr,
  c.contract_signed_at IS NOT NULL AS contract_signed,
  c.product_tags
FROM orders o
LEFT JOIN crystal_soul_cards c ON c.order_id = o.id
WHERE o.is_paid = true
  AND o.status <> 'cancelled'
ORDER BY o.created_at DESC
LIMIT 50;
