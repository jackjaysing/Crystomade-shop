-- QR 轉傳：非購買人掃描簽署時，視同接手魔導書（與贈送契約相同）
-- 於 Supabase SQL Editor 執行（需先執行 migration-grimoire-activation-qr.sql）

CREATE OR REPLACE FUNCTION activation_crystal_soul_card_role(p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_owner UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anonymous';
  END IF;

  SELECT user_id INTO v_owner
  FROM crystal_soul_cards
  WHERE activation_slug = trim(p_slug)
    AND contract_signed_at IS NULL;

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  IF v_owner = auth.uid() THEN
    RETURN 'owner';
  END IF;

  RETURN 'recipient';
END;
$$;

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

  IF v_card.user_id = auth.uid() THEN
    UPDATE crystal_soul_cards
    SET
      contract_signed_at = COALESCE(contract_signed_at, now()),
      contract_signer_name = COALESCE(contract_signer_name, v_name),
      energy_level = LEAST(100, GREATEST(energy_level, 70))
    WHERE id = v_card.id
    RETURNING * INTO v_card;

    RETURN v_card;
  END IF;

  v_from_user := v_card.user_id;

  UPDATE crystal_soul_cards
  SET
    user_id = auth.uid(),
    gifted_from_user_id = v_from_user,
    gifted_at = now(),
    contract_signed_at = now(),
    contract_signer_name = v_name,
    energy_level = LEAST(100, GREATEST(energy_level, 70)),
    gift_claim_slug = NULL,
    is_public = false
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

GRANT EXECUTE ON FUNCTION activation_crystal_soul_card_role(TEXT) TO anon, authenticated;
