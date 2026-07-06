-- 魔法師等級平衡（B 方案）：極境後日常巫師修為 + 會員累積欄位
-- 於 Supabase SQL Editor 執行（可重複執行；需先執行 migration-grimoire-five-ranks.sql）

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS grimoire_merit_xp INTEGER NOT NULL DEFAULT 0
    CHECK (grimoire_merit_xp >= 0);

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS grimoire_merit_daily_date DATE;

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS grimoire_merit_daily_amount INTEGER NOT NULL DEFAULT 0
    CHECK (grimoire_merit_daily_amount >= 0 AND grimoire_merit_daily_amount <= 6);

COMMENT ON COLUMN member_profiles.grimoire_merit_xp IS '極境後日常修行累積的巫師修為（全帳號）';
COMMENT ON COLUMN member_profiles.grimoire_merit_daily_amount IS '當日已獲得的日常巫師修為（上限 6）';

-- ------------------------------------------------------------
-- 極境之書完成任務：每日最多 +6 巫師修為（每任務 +2）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_grimoire_daily_merit(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 2
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INTEGER;
  v_grant INTEGER;
  v_daily_cap CONSTANT INTEGER := 6;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  SELECT
    CASE
      WHEN grimoire_merit_daily_date = CURRENT_DATE THEN grimoire_merit_daily_amount
      ELSE 0
    END
  INTO v_used
  FROM member_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_grant := LEAST(p_amount, GREATEST(0, v_daily_cap - COALESCE(v_used, 0)));

  IF v_grant <= 0 THEN
    RETURN;
  END IF;

  UPDATE member_profiles
  SET
    grimoire_merit_xp = grimoire_merit_xp + v_grant,
    grimoire_merit_daily_date = CURRENT_DATE,
    grimoire_merit_daily_amount = CASE
      WHEN grimoire_merit_daily_date = CURRENT_DATE THEN grimoire_merit_daily_amount + v_grant
      ELSE v_grant
    END
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION complete_crystal_grimoire_task(
  p_card_id UUID,
  p_task_type TEXT
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_boost INTEGER;
  v_cooldown INTERVAL;
  v_last TIMESTAMPTZ;
  v_label TEXT;
  v_new_count INTEGER;
  v_new_status TEXT;
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

  IF v_card.contract_signed_at IS NULL THEN
    RAISE EXCEPTION '請先簽署能量契約';
  END IF;

  CASE trim(p_task_type)
    WHEN 'purify' THEN
      v_boost := 10;
      v_cooldown := interval '24 hours';
      v_last := v_card.last_purify_at;
      v_label := '淨化';
    WHEN 'moon' THEN
      v_boost := 10;
      v_cooldown := interval '24 hours';
      v_last := v_card.last_moon_charge_at;
      v_label := '與水晶對話';
    WHEN 'meditation' THEN
      v_boost := 15;
      v_cooldown := interval '24 hours';
      v_last := v_card.last_meditation_at;
      v_label := '靜心冥想';
    ELSE
      RAISE EXCEPTION '未知的互動任務';
  END CASE;

  IF v_last IS NOT NULL AND v_last + v_cooldown > now() THEN
    RAISE EXCEPTION '%任務冷卻中，請稍後再試', v_label;
  END IF;

  v_new_count := v_card.grimoire_task_count + 1;
  v_new_status := derive_crystal_magic_status(v_new_count, v_card.contract_signed_at);

  UPDATE crystal_soul_cards
  SET
    grimoire_task_count = v_new_count,
    energy_level = LEAST(100, energy_level + v_boost),
    last_purify_at = CASE WHEN trim(p_task_type) = 'purify' THEN now() ELSE last_purify_at END,
    last_moon_charge_at = CASE WHEN trim(p_task_type) = 'moon' THEN now() ELSE last_moon_charge_at END,
    last_meditation_at = CASE WHEN trim(p_task_type) = 'meditation' THEN now() ELSE last_meditation_at END,
    magic_status = v_new_status,
    awakened_at = CASE
      WHEN awakened_at IS NULL AND v_new_status IN ('awakening', 'resonating', 'ascendant') THEN now()
      ELSE awakened_at
    END
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  IF v_card.magic_status = 'ascendant' THEN
    PERFORM award_grimoire_daily_merit(auth.uid(), 2);
  END IF;

  RETURN v_card;
END;
$$;
