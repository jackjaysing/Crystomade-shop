-- 修正代購修為虛高（例：買 1 件卻顯示 195 = 13×15）
-- 原因：舊版 purchased_by_user_id 回填錯誤，把別人的卡算進代購
-- 於 Supabase SQL Editor 執行（可重複執行）

-- ------------------------------------------------------------
-- 1) 依訂單重設購買人（轉贈卡保留原購買人）
-- ------------------------------------------------------------
UPDATE crystal_soul_cards c
SET purchased_by_user_id = o.user_id
FROM orders o
WHERE c.order_id = o.id
  AND o.user_id IS NOT NULL
  AND c.gifted_from_user_id IS NULL;

UPDATE crystal_soul_cards c
SET purchased_by_user_id = c.gifted_from_user_id
WHERE c.gifted_from_user_id IS NOT NULL;

UPDATE crystal_soul_cards
SET purchased_by_user_id = user_id
WHERE purchased_by_user_id IS NULL
  AND user_id IS NOT NULL
  AND gifted_from_user_id IS NULL;

-- ------------------------------------------------------------
-- 2) 代購本數：僅計「訂單購買人 = 會員」且訂單已付款/已出貨的靈魂卡
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

-- ------------------------------------------------------------
-- 3) 診斷：代購本數 vs 合格訂單（執行後檢查）
-- ------------------------------------------------------------
SELECT
  mp.real_name,
  mp.phone,
  mp.grimoire_merit_xp AS daily_merit_xp,
  grimoire_eligible_purchase_merit_card_count(mp.id) AS merit_cards,
  grimoire_eligible_purchase_merit_card_count(mp.id) * 15 AS purchase_xp,
  COALESCE((
    SELECT SUM(soul_card_owner_cultivation_xp(c))
    FROM crystal_soul_cards c
    WHERE c.user_id = mp.id
  ), 0) AS owner_xp,
  member_magician_total_xp(mp.id) AS total_xp,
  (
    SELECT COUNT(*)
    FROM crystal_soul_cards c
    WHERE c.purchased_by_user_id = mp.id
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = c.order_id
          AND o.user_id = mp.id
          AND o.status <> 'cancelled'
          AND COALESCE(o.is_point_redemption, false) = false
          AND (o.is_paid = true OR o.status = 'shipped')
      )
  ) AS stray_merit_cards
FROM member_profiles mp
WHERE grimoire_eligible_purchase_merit_card_count(mp.id) > 0
   OR EXISTS (
     SELECT 1 FROM orders o
     WHERE o.user_id = mp.id
       AND o.status <> 'cancelled'
       AND COALESCE(o.is_point_redemption, false) = false
       AND (o.is_paid = true OR o.status = 'shipped')
   )
ORDER BY total_xp DESC
LIMIT 30;
