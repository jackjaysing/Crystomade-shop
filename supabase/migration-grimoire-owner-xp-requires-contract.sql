-- 修正：未簽約不計修行修為（僅購買人 +15）
-- 於 Supabase SQL Editor 執行（可重複執行）

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
