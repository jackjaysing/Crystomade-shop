-- 魔導書五階晉升：以累積修行次數取代能量自動升階
-- 於 Supabase SQL Editor 執行（可重複執行；需先執行 migration-grimoire-task-cooldown-24h.sql）
-- ⚠️ 若已執行 migration-grimoire-magician-balance.sql，請勿重跑本檔（會覆寫 complete_crystal_grimoire_task）。

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS grimoire_task_count INTEGER NOT NULL DEFAULT 0
    CHECK (grimoire_task_count >= 0);

COMMENT ON COLUMN crystal_soul_cards.grimoire_task_count IS '累積完成的修行任務次數（簽約後起算）';

-- ------------------------------------------------------------
-- 依任務次數推導階級
-- 簽約 → 星芒；6 次 → 覺醒；15 次 → 共鳴；30 次 → 極境
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION derive_crystal_magic_status(
  p_task_count INTEGER,
  p_contract_signed TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_contract_signed IS NULL THEN
    RETURN 'dormant';
  END IF;

  IF p_task_count >= 30 THEN
    RETURN 'ascendant';
  ELSIF p_task_count >= 15 THEN
    RETURN 'resonating';
  ELSIF p_task_count >= 6 THEN
    RETURN 'awakening';
  ELSE
    RETURN 'starlight';
  END IF;
END;
$$;

-- 舊資料遷移：須先放寬 CHECK，才能寫入 starlight / ascendant
ALTER TABLE crystal_soul_cards
  DROP CONSTRAINT IF EXISTS crystal_soul_cards_magic_status_check;

UPDATE crystal_soul_cards
SET grimoire_task_count = GREATEST(grimoire_task_count, 30)
WHERE magic_status = 'resonating';

UPDATE crystal_soul_cards
SET grimoire_task_count = GREATEST(grimoire_task_count, 6)
WHERE magic_status = 'awakening';

UPDATE crystal_soul_cards
SET magic_status = 'ascendant'
WHERE magic_status = 'resonating';

UPDATE crystal_soul_cards
SET magic_status = 'starlight'
WHERE contract_signed_at IS NOT NULL
  AND magic_status = 'dormant';

ALTER TABLE crystal_soul_cards
  ADD CONSTRAINT crystal_soul_cards_magic_status_check
  CHECK (magic_status IN ('dormant', 'starlight', 'awakening', 'resonating', 'ascendant'));

-- ------------------------------------------------------------
-- 簽署能量契約 → 晉升至星芒
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sign_crystal_energy_contract(
  p_card_id UUID,
  p_signer_name TEXT DEFAULT NULL
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_name TEXT;
  v_signed TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  v_name := NULLIF(trim(COALESCE(p_signer_name, '')), '');
  v_signed := now();

  UPDATE crystal_soul_cards
  SET
    contract_signed_at = COALESCE(contract_signed_at, v_signed),
    contract_signer_name = COALESCE(contract_signer_name, v_name),
    energy_level = LEAST(100, GREATEST(energy_level, 70)),
    magic_status = derive_crystal_magic_status(
      grimoire_task_count,
      COALESCE(contract_signed_at, v_signed)
    )
  WHERE id = p_card_id
    AND user_id = auth.uid()
  RETURNING * INTO v_card;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到靈魂卡或無權限';
  END IF;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 掃描 QR / 贈送簽約：同步晉升至星芒
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sign_crystal_energy_contract_by_activation(
  p_slug TEXT,
  p_signer_name TEXT DEFAULT NULL
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_name TEXT;
  v_from_user UUID;
  v_signed TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  SELECT * INTO v_card
  FROM crystal_soul_cards
  WHERE activation_slug = trim(p_slug)
    AND contract_signed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '簽約連結已失效，或契約已完成簽署';
  END IF;

  v_name := NULLIF(trim(COALESCE(p_signer_name, '')), '');
  v_signed := now();

  IF v_card.user_id = auth.uid() THEN
    UPDATE crystal_soul_cards
    SET
      contract_signed_at = COALESCE(contract_signed_at, v_signed),
      contract_signer_name = COALESCE(contract_signer_name, v_name),
      energy_level = LEAST(100, GREATEST(energy_level, 70)),
      magic_status = derive_crystal_magic_status(grimoire_task_count, v_signed)
    WHERE id = v_card.id
    RETURNING * INTO v_card;

    RETURN v_card;
  END IF;

  v_from_user := v_card.user_id;

  UPDATE crystal_soul_cards
  SET
    user_id = auth.uid(),
    gifted_from_user_id = v_from_user,
    gifted_at = v_signed,
    contract_signed_at = v_signed,
    contract_signer_name = v_name,
    energy_level = LEAST(100, GREATEST(energy_level, 70)),
    magic_status = derive_crystal_magic_status(grimoire_task_count, v_signed),
    gift_claim_slug = NULL,
    is_public = false
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

CREATE OR REPLACE FUNCTION claim_crystal_soul_card_gift(
  p_slug TEXT,
  p_signer_name TEXT DEFAULT NULL
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_name TEXT;
  v_from_user UUID;
  v_signed TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入會員後再簽署契約';
  END IF;

  SELECT * INTO v_card
  FROM crystal_soul_cards
  WHERE gift_claim_slug = trim(p_slug)
    AND contract_signed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '贈送連結已失效或契約已完成';
  END IF;

  IF v_card.user_id = auth.uid() THEN
    RAISE EXCEPTION '請將連結傳給受贈的朋友簽署；代購者請自行簽署或請朋友以其帳號開啟此連結';
  END IF;

  v_name := NULLIF(trim(COALESCE(p_signer_name, '')), '');
  v_from_user := v_card.user_id;
  v_signed := now();

  UPDATE crystal_soul_cards
  SET
    user_id = auth.uid(),
    gifted_from_user_id = v_from_user,
    gifted_at = v_signed,
    contract_signed_at = v_signed,
    contract_signer_name = v_name,
    energy_level = LEAST(100, GREATEST(energy_level, 70)),
    magic_status = derive_crystal_magic_status(grimoire_task_count, v_signed),
    gift_claim_slug = NULL,
    is_public = false
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 完成修行任務：累積次數並依門檻晉升
-- ------------------------------------------------------------
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

  IF v_card.magic_status = 'ascendant' AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'award_grimoire_daily_merit'
  ) THEN
    PERFORM award_grimoire_daily_merit(auth.uid(), 2);
  END IF;

  RETURN v_card;
END;
$$;

-- ------------------------------------------------------------
-- 停用一鍵手動晉升（改由修行累積）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION advance_crystal_soul_card_status(p_card_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  RAISE EXCEPTION '階級需透過每日修行任務累積晉升，無法手動跳階';
END;
$$;

-- ------------------------------------------------------------
-- 開發測試：一鍵升至極境（僅限卡片擁有者）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION dev_max_upgrade_crystal_soul_card(p_card_id UUID)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  UPDATE crystal_soul_cards
  SET
    contract_signed_at = COALESCE(contract_signed_at, v_now),
    energy_level = 100,
    grimoire_task_count = GREATEST(grimoire_task_count, 30),
    magic_status = 'ascendant',
    awakened_at = COALESCE(awakened_at, v_now),
    last_purify_at = v_now,
    last_moon_charge_at = v_now,
    last_meditation_at = v_now
  WHERE id = p_card_id
    AND user_id = auth.uid()
  RETURNING * INTO v_card;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到靈魂卡或無權限';
  END IF;

  RETURN v_card;
END;
$$;

GRANT EXECUTE ON FUNCTION dev_max_upgrade_crystal_soul_card(UUID) TO authenticated;
