-- 修正 admin_fetch_magician_soul_cards 回傳型別變更錯誤（42P13）
-- 若 migration-grimoire-purchaser-merit.sql 卡在 RPC 這段，先跑本檔再重跑 purchaser-merit
-- 於 Supabase SQL Editor 執行（可重複執行）

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

COMMENT ON FUNCTION admin_fetch_magician_soul_cards IS
  '後台生日禮／魔法師等級計算用；含 purchased_by_user_id（代購修為）';

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
