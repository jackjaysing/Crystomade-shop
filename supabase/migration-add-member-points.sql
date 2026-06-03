-- 會員資料、集點紀錄、訂單關聯會員、付款/出貨後發點
-- 於 Supabase Dashboard → SQL Editor 執行（可重複執行）
-- 請在 Authentication → Providers 啟用 Email，並關閉「Confirm email」以便電話註冊後即可登入

-- ------------------------------------------------------------
-- 會員資料（對應 auth.users）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  real_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  birthday DATE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_profiles_phone ON member_profiles (phone);

COMMENT ON TABLE member_profiles IS '會員資料：真實姓名、生日、電話、集點';
COMMENT ON COLUMN member_profiles.phone IS '正規化電話（僅數字，台灣 886 開頭）';
COMMENT ON COLUMN member_profiles.points IS '目前可用點數';

-- ------------------------------------------------------------
-- 點數變動紀錄
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  description TEXT NOT NULL,
  checkout_id UUID,
  order_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_history_user_created
  ON points_history (user_id, created_at DESC);

COMMENT ON TABLE points_history IS '點數增減紀錄';

-- ------------------------------------------------------------
-- 發點冪等（同一結帳／訂單編號只發一次）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  award_key TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (award_key)
);

-- ------------------------------------------------------------
-- 訂單關聯會員
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);

COMMENT ON COLUMN orders.user_id IS '下單時登入的會員 ID';

-- ------------------------------------------------------------
-- 新註冊使用者建立會員列（metadata 由前端 signUp 帶入）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_member_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_real_name TEXT;
  v_birthday DATE;
BEGIN
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_real_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'real_name', '')), '');
  v_birthday := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'birthday', '')), '')::date;

  IF v_phone IS NULL OR v_real_name IS NULL OR v_birthday IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO member_profiles (id, real_name, phone, birthday)
  VALUES (NEW.id, v_real_name, v_phone, v_birthday)
  ON CONFLICT (id) DO UPDATE SET
    real_name = EXCLUDED.real_name,
    phone = EXCLUDED.phone,
    birthday = EXCLUDED.birthday,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_member ON auth.users;
CREATE TRIGGER on_auth_user_created_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_member_user();

-- ------------------------------------------------------------
-- 集點：每消費 NT$100 累積 1 點（已付款或已出貨後發放）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION try_award_points_for_order_group(
  p_checkout_id UUID,
  p_order_number TEXT,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award_key TEXT;
  v_total NUMERIC;
  v_points INTEGER;
  v_balance INTEGER;
  v_order_label TEXT;
  v_eligible BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  v_award_key := COALESCE(p_checkout_id::text, NULLIF(trim(p_order_number), ''));
  IF v_award_key IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM point_awards WHERE award_key = v_award_key) THEN
    RETURN;
  END IF;

  IF p_checkout_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.checkout_id = p_checkout_id
        AND o.user_id = p_user_id
        AND o.status <> 'cancelled'
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;

    SELECT COALESCE(SUM(o.total_amount), 0)
    INTO v_total
    FROM orders o
    WHERE o.checkout_id = p_checkout_id
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled';
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.order_number = p_order_number
        AND o.user_id = p_user_id
        AND o.status <> 'cancelled'
        AND (o.is_paid = true OR o.status = 'shipped')
    ) INTO v_eligible;

    SELECT COALESCE(SUM(o.total_amount), 0)
    INTO v_total
    FROM orders o
    WHERE o.order_number = p_order_number
      AND o.user_id = p_user_id
      AND o.status <> 'cancelled';
  END IF;

  IF NOT v_eligible THEN
    RETURN;
  END IF;

  v_points := FLOOR(v_total / 100)::INTEGER;
  IF v_points <= 0 THEN
    RETURN;
  END IF;

  v_order_label := COALESCE(NULLIF(trim(p_order_number), ''), v_award_key);

  INSERT INTO point_awards (user_id, award_key, points)
  VALUES (p_user_id, v_award_key, v_points);

  UPDATE member_profiles
  SET points = points + v_points, updated_at = now()
  WHERE id = p_user_id
  RETURNING points INTO v_balance;

  INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
  VALUES (
    p_user_id,
    v_points,
    v_balance,
    '+' || v_points::text || ' 點（訂單 ' || v_order_label || ' 消費贈送）',
    p_checkout_id,
    NULLIF(trim(p_order_number), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION orders_points_award_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NOT NULL AND NEW.status <> 'cancelled' THEN
      IF (NEW.is_paid = true AND COALESCE(OLD.is_paid, false) IS DISTINCT FROM true)
         OR (NEW.status = 'shipped'::order_status AND OLD.status IS DISTINCT FROM 'shipped'::order_status) THEN
        PERFORM try_award_points_for_order_group(NEW.checkout_id, NEW.order_number, NEW.user_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_points_award_trigger ON orders;
CREATE TRIGGER orders_points_award_trigger
  AFTER UPDATE OF is_paid, status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_points_award_trigger_fn();

-- ------------------------------------------------------------
-- 下單 RPC：支援會員 user_id
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT
);

CREATE OR REPLACE FUNCTION place_order_with_stock(
  p_product_id UUID,
  p_total_amount NUMERIC,
  p_buyer_name TEXT,
  p_line_name TEXT,
  p_phone TEXT,
  p_cvs_brand TEXT,
  p_cvs_store TEXT,
  p_checkout_id UUID DEFAULT NULL,
  p_selected_size TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INTEGER;
  v_product_name TEXT;
  v_product_image_url TEXT;
  v_order_number TEXT;
  v_new_order orders;
BEGIN
  SELECT stock, name, image_url
  INTO v_stock, v_product_name, v_product_image_url
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '商品不存在';
  END IF;

  IF v_stock <= 0 THEN
    RAISE EXCEPTION '此商品已售罄，無法下單';
  END IF;

  IF p_checkout_id IS NOT NULL THEN
    SELECT order_number INTO v_order_number
    FROM orders
    WHERE checkout_id = p_checkout_id
    LIMIT 1;
  END IF;

  IF v_order_number IS NULL THEN
    v_order_number := generate_order_number();
  END IF;

  UPDATE products
  SET
    stock = stock - 1,
    status = CASE WHEN stock - 1 <= 0 THEN 'sold'::product_status ELSE status END
  WHERE id = p_product_id;

  INSERT INTO orders (
    buyer_name,
    line_name,
    phone,
    cvs_brand,
    cvs_store,
    product_id,
    product_name,
    product_image_url,
    total_amount,
    status,
    checkout_id,
    order_number,
    selected_size,
    user_id
  ) VALUES (
    trim(p_buyer_name),
    NULLIF(trim(COALESCE(p_line_name, '')), ''),
    trim(p_phone),
    p_cvs_brand,
    trim(p_cvs_store),
    p_product_id,
    v_product_name,
    v_product_image_url,
    p_total_amount,
    'pending'::order_status,
    p_checkout_id,
    v_order_number,
    NULLIF(trim(COALESCE(p_selected_size, '')), ''),
    p_user_id
  )
  RETURNING * INTO v_new_order;

  RETURN NEXT v_new_order;
END;
$$;

GRANT EXECUTE ON FUNCTION place_order_with_stock(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID
) TO anon, authenticated;

-- ------------------------------------------------------------
-- RLS：會員僅能讀取自己的資料
-- ------------------------------------------------------------
ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "會員建立資料" ON member_profiles;
CREATE POLICY "會員建立資料"
ON member_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "會員讀取自己的資料" ON member_profiles;
CREATE POLICY "會員讀取自己的資料"
ON member_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "會員更新自己的資料" ON member_profiles;
CREATE POLICY "會員更新自己的資料"
ON member_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "會員讀取自己的點數紀錄" ON points_history;
CREATE POLICY "會員讀取自己的點數紀錄"
ON points_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "會員讀取自己的訂單" ON orders;
CREATE POLICY "會員讀取自己的訂單"
ON orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());
