-- 優惠券：範本、會員持有、結帳兌換
-- 於 Supabase SQL Editor 執行整段（可重複執行）

-- ------------------------------------------------------------
-- 優惠券範本
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  coupon_type TEXT NOT NULL CHECK (
    coupon_type IN ('fixed_discount', 'percent_discount', 'gift')
  ),
  min_purchase_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_purchase_amount >= 0),
  discount_amount NUMERIC(12, 2) CHECK (
    discount_amount IS NULL OR discount_amount >= 0
  ),
  discount_zhe NUMERIC(4, 2) CHECK (
    discount_zhe IS NULL OR (discount_zhe > 0 AND discount_zhe < 10)
  ),
  gift_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_days INTEGER CHECK (valid_days IS NULL OR valid_days > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, created_at DESC);

COMMENT ON TABLE coupons IS '優惠券範本：純折抵、純打折、禮物券';

-- ------------------------------------------------------------
-- 會員優惠券（發放紀錄）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'used', 'expired')
  ),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  checkout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_coupons_user_status
  ON member_coupons (user_id, status, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_coupons_coupon
  ON member_coupons (coupon_id);

-- ------------------------------------------------------------
-- 訂單紀錄優惠券
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS member_coupon_id UUID
  REFERENCES member_coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_coupon_discount NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_gift_note TEXT;

-- ------------------------------------------------------------
-- RLS（後台 anon 可管理；會員僅讀自己的）
-- ------------------------------------------------------------
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "後台讀取優惠券範本" ON coupons;
CREATE POLICY "後台讀取優惠券範本"
ON coupons FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "後台寫入優惠券範本" ON coupons;
CREATE POLICY "後台寫入優惠券範本"
ON coupons FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "後台更新優惠券範本" ON coupons;
CREATE POLICY "後台更新優惠券範本"
ON coupons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "後台刪除優惠券範本" ON coupons;
CREATE POLICY "後台刪除優惠券範本"
ON coupons FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "後台讀取會員優惠券" ON member_coupons;
CREATE POLICY "後台讀取會員優惠券"
ON member_coupons FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "後台寫入會員優惠券" ON member_coupons;
CREATE POLICY "後台寫入會員優惠券"
ON member_coupons FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "後台更新會員優惠券" ON member_coupons;
CREATE POLICY "後台更新會員優惠券"
ON member_coupons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "會員讀取自己的優惠券" ON member_coupons;
CREATE POLICY "會員讀取自己的優惠券"
ON member_coupons FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 計算優惠券折抵（伺服器驗證）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calc_coupon_discount_ntd(
  p_coupon_type TEXT,
  p_product_subtotal NUMERIC,
  p_min_purchase NUMERIC,
  p_discount_amount NUMERIC,
  p_discount_zhe NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_sub NUMERIC := GREATEST(0, COALESCE(p_product_subtotal, 0));
  v_min NUMERIC := GREATEST(0, COALESCE(p_min_purchase, 0));
  v_discounted NUMERIC;
BEGIN
  IF v_sub < v_min THEN
    RETURN 0;
  END IF;

  IF p_coupon_type = 'gift' THEN
    RETURN 0;
  END IF;

  IF p_coupon_type = 'fixed_discount' THEN
    RETURN LEAST(GREATEST(0, COALESCE(p_discount_amount, 0)), v_sub);
  END IF;

  IF p_coupon_type = 'percent_discount' THEN
    IF p_discount_zhe IS NULL OR p_discount_zhe <= 0 OR p_discount_zhe >= 10 THEN
      RETURN 0;
    END IF;
    v_discounted := FLOOR(v_sub * p_discount_zhe / 10);
    RETURN GREATEST(0, v_sub - v_discounted);
  END IF;

  RETURN 0;
END;
$$;

-- ------------------------------------------------------------
-- 發放優惠券給單一會員
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_issue_coupon_to_member(
  p_coupon_id UUID,
  p_user_id UUID
)
RETURNS member_coupons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons;
  v_row member_coupons;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION '優惠券不存在或已停用';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM member_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION '找不到會員';
  END IF;

  v_expires := CASE
    WHEN v_coupon.valid_days IS NULL THEN NULL
    ELSE now() + (v_coupon.valid_days || ' days')::interval
  END;

  INSERT INTO member_coupons (user_id, coupon_id, expires_at)
  VALUES (p_user_id, p_coupon_id, v_expires)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 一鍵發放給全部會員
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_issue_coupon_to_all(p_coupon_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons;
  v_expires TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION '優惠券不存在或已停用';
  END IF;

  v_expires := CASE
    WHEN v_coupon.valid_days IS NULL THEN NULL
    ELSE now() + (v_coupon.valid_days || ' days')::interval
  END;

  INSERT INTO member_coupons (user_id, coupon_id, expires_at)
  SELECT mp.id, p_coupon_id, v_expires
  FROM member_profiles mp;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 結帳兌換優惠券（標記已使用並寫入訂單）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION redeem_member_coupon(
  p_member_coupon_id UUID,
  p_checkout_id UUID,
  p_product_subtotal NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mc member_coupons;
  v_coupon coupons;
  v_discount NUMERIC;
  v_gift TEXT;
  v_first_order_id UUID;
BEGIN
  IF p_member_coupon_id IS NULL OR p_checkout_id IS NULL THEN
    RAISE EXCEPTION '參數不完整';
  END IF;

  SELECT mc.* INTO v_mc
  FROM member_coupons mc
  WHERE mc.id = p_member_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到優惠券';
  END IF;

  IF v_mc.status <> 'available' THEN
    RAISE EXCEPTION '此優惠券無法使用';
  END IF;

  IF v_mc.expires_at IS NOT NULL AND v_mc.expires_at < now() THEN
    UPDATE member_coupons SET status = 'expired' WHERE id = p_member_coupon_id;
    RAISE EXCEPTION '優惠券已過期';
  END IF;

  SELECT * INTO v_coupon FROM coupons WHERE id = v_mc.coupon_id;
  IF NOT FOUND OR NOT v_coupon.is_active THEN
    RAISE EXCEPTION '優惠券已失效';
  END IF;

  v_discount := calc_coupon_discount_ntd(
    v_coupon.coupon_type,
    p_product_subtotal,
    v_coupon.min_purchase_amount,
    v_coupon.discount_amount,
    v_coupon.discount_zhe
  );

  IF p_product_subtotal < v_coupon.min_purchase_amount THEN
    RAISE EXCEPTION '未達優惠券滿額門檻';
  END IF;

  IF v_coupon.coupon_type = 'gift' THEN
    v_gift := NULLIF(trim(COALESCE(v_coupon.gift_description, v_coupon.title)), '');
    v_discount := 0;
  ELSE
    v_gift := NULL;
    IF v_discount <= 0 THEN
      RAISE EXCEPTION '此優惠券無法套用於目前金額';
    END IF;
  END IF;

  UPDATE member_coupons
  SET status = 'used',
      used_at = now(),
      checkout_id = p_checkout_id
  WHERE id = p_member_coupon_id;

  SELECT o.id INTO v_first_order_id
  FROM orders o
  WHERE o.checkout_id = p_checkout_id
    AND o.deleted_at IS NULL
  ORDER BY o.created_at
  LIMIT 1;

  IF v_first_order_id IS NOT NULL THEN
    UPDATE orders
    SET
      member_coupon_id = p_member_coupon_id,
      checkout_coupon_discount = v_discount,
      coupon_gift_note = v_gift
    WHERE checkout_id = p_checkout_id AND deleted_at IS NULL;

    IF v_discount > 0 THEN
      UPDATE orders
      SET total_amount = GREATEST(1, total_amount - v_discount)
      WHERE id = v_first_order_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'discount_ntd', v_discount,
    'gift_note', v_gift,
    'coupon_title', v_coupon.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_issue_coupon_to_member(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_issue_coupon_to_all(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_member_coupon(UUID, UUID, NUMERIC) TO anon, authenticated;
