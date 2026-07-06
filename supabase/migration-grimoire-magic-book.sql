-- 魔導書互動：能量槽、數位契約、淨化任務
-- 於 Supabase SQL Editor 執行（可重複執行；需先執行 migration-add-crystal-grimoire.sql）

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS energy_level INTEGER NOT NULL DEFAULT 60
    CHECK (energy_level >= 0 AND energy_level <= 100);

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS contract_signer_name TEXT;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS last_purify_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS last_moon_charge_at TIMESTAMPTZ;

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS last_meditation_at TIMESTAMPTZ;

COMMENT ON COLUMN crystal_soul_cards.energy_level IS '水晶能量槽 0–100';
COMMENT ON COLUMN crystal_soul_cards.contract_signed_at IS '擁有者簽署能量契約時間';

-- ------------------------------------------------------------
-- 擁有者：簽署能量契約
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  v_name := NULLIF(trim(COALESCE(p_signer_name, '')), '');

  UPDATE crystal_soul_cards
  SET
    contract_signed_at = COALESCE(contract_signed_at, now()),
    contract_signer_name = COALESCE(contract_signer_name, v_name),
    energy_level = LEAST(100, GREATEST(energy_level, 70))
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
-- 擁有者：完成互動任務（淨化 / 月光充能 / 靜心）
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
      v_cooldown := interval '12 hours';
      v_last := v_card.last_moon_charge_at;
      v_label := '與水晶對話';
    WHEN 'meditation' THEN
      v_boost := 15;
      v_cooldown := interval '8 hours';
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

-- ------------------------------------------------------------
-- 公開頁：補上能量與契約狀態（唯讀）
-- 回傳欄位變更時須先 DROP（PostgreSQL 不允許直接改 RETURNS TABLE）
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS get_public_crystal_soul_card(TEXT);

CREATE OR REPLACE FUNCTION get_public_crystal_soul_card(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  serial_number TEXT,
  product_name TEXT,
  product_image_url TEXT,
  selected_size TEXT,
  product_category TEXT,
  five_elements TEXT[],
  element_primary TEXT,
  magic_title TEXT,
  magic_affiliation TEXT,
  chakra TEXT,
  resonance_keyword TEXT,
  awakening_verse TEXT,
  magic_status TEXT,
  awakened_at TIMESTAMPTZ,
  energy_level INTEGER,
  contract_signed_at TIMESTAMPTZ,
  contract_signer_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.serial_number,
    c.product_name,
    c.product_image_url,
    c.selected_size,
    c.product_category,
    c.five_elements,
    c.element_primary,
    c.magic_title,
    c.magic_affiliation,
    c.chakra,
    c.resonance_keyword,
    c.awakening_verse,
    c.magic_status,
    c.awakened_at,
    c.energy_level,
    c.contract_signed_at,
    c.contract_signer_name,
    c.created_at
  FROM crystal_soul_cards c
  WHERE c.public_slug = trim(p_slug)
    AND c.is_public = true;
$$;

GRANT EXECUTE ON FUNCTION sign_crystal_energy_contract(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_crystal_grimoire_task(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_crystal_soul_card(TEXT) TO anon, authenticated;
