-- 後台：以 RPC 讀取靈魂卡修為快照（取代全表 SELECT 政策）
-- 於 Supabase SQL Editor 執行（可重複執行）

DROP POLICY IF EXISTS "後台讀取全部靈魂卡" ON crystal_soul_cards;

CREATE OR REPLACE FUNCTION admin_fetch_magician_soul_cards()
RETURNS TABLE (
  id UUID,
  user_id UUID,
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
  '後台生日禮／魔法師等級計算用；僅回傳修為相關欄位，不含序號、訂單、slug 等敏感資料';
