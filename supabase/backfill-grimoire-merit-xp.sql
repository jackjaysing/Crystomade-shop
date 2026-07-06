-- 補發：已付款「或」已出貨的歷史訂單靈魂卡 + 代購人回填
-- 前置：migration-grimoire-issue-on-shipped.sql（或 migration-grimoire-purchaser-merit.sql 新版）
-- 於 Supabase SQL Editor 執行（可重複執行）

SELECT backfill_crystal_soul_cards() AS new_cards_issued;

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

-- 檢視：有合格訂單但代購修為仍為 0 的會員
SELECT
  mp.real_name,
  mp.phone,
  COUNT(o.id) AS eligible_orders,
  COUNT(c.id) AS merit_cards
FROM member_profiles mp
JOIN orders o ON o.user_id = mp.id
  AND o.status <> 'cancelled'
  AND COALESCE(o.is_point_redemption, false) = false
  AND (o.is_paid = true OR o.status = 'shipped')
LEFT JOIN crystal_soul_cards c ON c.purchased_by_user_id = mp.id
GROUP BY mp.id, mp.real_name, mp.phone
HAVING COUNT(c.id) = 0
ORDER BY eligible_orders DESC
LIMIT 30;
