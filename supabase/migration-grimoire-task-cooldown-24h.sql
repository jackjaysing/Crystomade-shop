-- 水晶魔導書任務：統一冷卻 24 小時
-- 於 Supabase SQL Editor 執行（可重複執行）

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

  UPDATE crystal_soul_cards
  SET
    energy_level = LEAST(100, energy_level + v_boost),
    last_purify_at = CASE WHEN trim(p_task_type) = 'purify' THEN now() ELSE last_purify_at END,
    last_moon_charge_at = CASE WHEN trim(p_task_type) = 'moon' THEN now() ELSE last_moon_charge_at END,
    last_meditation_at = CASE WHEN trim(p_task_type) = 'meditation' THEN now() ELSE last_meditation_at END,
    magic_status = CASE
      WHEN LEAST(100, energy_level + v_boost) >= 90 AND magic_status = 'dormant' THEN 'awakening'
      WHEN LEAST(100, energy_level + v_boost) = 100 AND magic_status = 'awakening' THEN 'resonating'
      ELSE magic_status
    END,
    awakened_at = CASE
      WHEN awakened_at IS NULL
        AND LEAST(100, energy_level + v_boost) >= 70 THEN now()
      ELSE awakened_at
    END
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;
