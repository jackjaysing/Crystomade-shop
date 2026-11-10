-- ============================================================
-- 優惠券：註冊自動發放 + 結帳自動套用
-- Supabase SQL Editor 執行
-- ============================================================

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS auto_issue_on_register BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS auto_apply_at_checkout BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN coupons.auto_issue_on_register IS
  '啟用後，新會員註冊完成自動發放一張（舊客請另按一鍵全發）';

COMMENT ON COLUMN coupons.auto_apply_at_checkout IS
  '啟用後，結帳達門檻時預設自動選用（會員仍可改選或不使用）';

CREATE INDEX IF NOT EXISTS idx_coupons_auto_issue_on_register
  ON coupons (auto_issue_on_register)
  WHERE auto_issue_on_register = true AND is_active = true;

-- ------------------------------------------------------------
-- 新會員：發放所有「註冊自動發放」的啟用中結帳券
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION issue_auto_register_coupons(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons;
  v_expires TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM member_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION '找不到會員';
  END IF;

  FOR v_coupon IN
    SELECT *
    FROM coupons
    WHERE is_active = true
      AND auto_issue_on_register = true
      AND COALESCE(redeem_mode, 'checkout') = 'checkout'
  LOOP
    IF EXISTS (
      SELECT 1
      FROM member_coupons
      WHERE user_id = p_user_id
        AND coupon_id = v_coupon.id
        AND status = 'available'
    ) THEN
      CONTINUE;
    END IF;

    v_expires := CASE
      WHEN v_coupon.valid_days IS NULL THEN NULL
      ELSE now() + (v_coupon.valid_days || ' days')::interval
    END;

    INSERT INTO member_coupons (user_id, coupon_id, expires_at)
    VALUES (p_user_id, v_coupon.id, v_expires);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION issue_auto_register_coupons(UUID) TO anon, authenticated;
