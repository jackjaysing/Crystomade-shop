-- 魔導書：電話轉送 + 等級改純購買（與前端門檻對齊）
-- 於 Supabase SQL Editor 執行（可重複執行）

-- ------------------------------------------------------------
-- 1) VIP 等級：經驗值 = 累積實付消費（詳見 migration-grimoire-vip-spend-xp.sql）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION member_eligible_purchase_amount(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN COALESCE(o.is_point_redemption, false) THEN 0
      ELSE GREATEST(0, ROUND(COALESCE(o.total_amount, 0))::INTEGER)
    END
  ), 0)::INTEGER
  FROM orders o
  WHERE p_user_id IS NOT NULL
    AND o.user_id = p_user_id
    AND o.status <> 'cancelled'
    AND (o.is_paid = true OR o.status = 'shipped');
$$;

CREATE OR REPLACE FUNCTION member_vip_purchase_xp(p_user_id UUID DEFAULT auth.uid())
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
    RAISE EXCEPTION '無權限查詢其他會員的經驗值';
  END IF;

  RETURN member_eligible_purchase_amount(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION member_magician_total_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT member_eligible_purchase_amount(p_user_id);
$$;

CREATE OR REPLACE FUNCTION member_magician_tier(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_total_xp >= 50000 THEN 7
    WHEN p_total_xp >= 35000 THEN 6
    WHEN p_total_xp >= 25000 THEN 5
    WHEN p_total_xp >= 15000 THEN 4
    WHEN p_total_xp >= 8000 THEN 3
    WHEN p_total_xp >= 3000 THEN 2
    ELSE 1
  END;
$$;

GRANT EXECUTE ON FUNCTION member_eligible_purchase_amount(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_vip_purchase_xp(UUID) TO anon, authenticated;

-- ------------------------------------------------------------
-- 2) 電話正規化（與前端 normalizePhone 對齊：8869xxxxxxxx）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_member_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_digits LIKE '886%' THEN
    RETURN v_digits;
  END IF;
  IF v_digits LIKE '0%' THEN
    RETURN '886' || substr(v_digits, 2);
  END IF;
  IF length(v_digits) = 9 AND v_digits LIKE '9%' THEN
    RETURN '886' || v_digits;
  END IF;
  RETURN v_digits;
END;
$$;

-- ------------------------------------------------------------
-- 3) 持有人以對方手機立即轉送（對方需已註冊；需重新簽約）
--    p_confirm_code：前端防誤觸碼，後端僅檢查非空六碼
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION transfer_crystal_soul_card_by_phone(
  p_card_id UUID,
  p_phone TEXT,
  p_confirm_code TEXT
)
RETURNS crystal_soul_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card crystal_soul_cards%ROWTYPE;
  v_phone TEXT;
  v_code TEXT;
  v_recipient UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '請先登入';
  END IF;

  v_code := trim(COALESCE(p_confirm_code, ''));
  IF v_code !~ '^\d{6}$' THEN
    RAISE EXCEPTION '請輸入六位驗證碼';
  END IF;

  v_phone := normalize_member_phone(p_phone);
  IF v_phone !~ '^8869\d{8}$' THEN
    RAISE EXCEPTION '請填寫有效的台灣手機號碼';
  END IF;

  SELECT * INTO v_card
  FROM crystal_soul_cards
  WHERE id = p_card_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到魔導書或無權限';
  END IF;

  SELECT id INTO v_recipient
  FROM member_profiles
  WHERE phone = v_phone
     OR phone = '0' || substr(v_phone, 4)
  LIMIT 1;

  IF v_recipient IS NULL THEN
    RAISE EXCEPTION '對方需先用此電話註冊會員';
  END IF;

  IF v_recipient = auth.uid() THEN
    RAISE EXCEPTION '不可轉送給自己';
  END IF;

  UPDATE crystal_soul_cards
  SET
    user_id = v_recipient,
    gifted_from_user_id = auth.uid(),
    gifted_at = now(),
    gift_claim_slug = NULL,
    contract_signed_at = NULL,
    contract_signer_name = NULL,
    magic_status = 'dormant',
    is_public = false,
    energy_level = LEAST(energy_level, 60)
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_crystal_soul_card_by_phone(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_member_phone(TEXT) TO authenticated;
