-- ============================================================
-- 商品成本（私密）與分潤歸屬
-- - studio_location：仍在 products（分潤歸屬人選）
-- - cost：獨立表 product_costs，RLS 禁止公開讀取
--   僅能透過後台 SECURITY DEFINER RPC 讀寫
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

-- ── 分潤歸屬（公開商品欄位）──────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS studio_location TEXT;

COMMENT ON COLUMN products.studio_location IS '分潤歸屬（羽薇／Ken／Johnman），null 表示未指定';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_studio_location_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_studio_location_check
      CHECK (studio_location IS NULL OR studio_location IN ('羽薇', 'Ken', 'Johnman'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_studio_location
  ON products (studio_location)
  WHERE studio_location IS NOT NULL AND deleted_at IS NULL;

-- ── 私密成本表（訪客／公開金鑰不可 SELECT）──────────────────
CREATE TABLE IF NOT EXISTS product_costs (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_costs IS '商品單件成本（僅後台 RPC 可讀寫，不對外公開）';
COMMENT ON COLUMN product_costs.cost IS '單件成本（NT$），用於淨利潤與分潤';

ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;

-- 刻意不建立任何 anon/authenticated policy → 直接查表會被拒絕
DROP POLICY IF EXISTS "公開讀取商品成本" ON product_costs;
DROP POLICY IF EXISTS "後台讀取商品成本" ON product_costs;
DROP POLICY IF EXISTS "後台寫入商品成本" ON product_costs;

REVOKE ALL ON TABLE product_costs FROM anon, authenticated;
GRANT ALL ON TABLE product_costs TO service_role;

-- 若先前版本已把 cost 加在 products，搬移後刪除公開欄位
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'cost'
  ) THEN
    INSERT INTO product_costs (product_id, cost, updated_at)
    SELECT id, GREATEST(0, COALESCE(cost, 0)), now()
    FROM products
    ON CONFLICT (product_id) DO UPDATE
      SET cost = EXCLUDED.cost,
          updated_at = now();

    ALTER TABLE products DROP COLUMN cost;
  END IF;
END $$;

-- ── 後台 RPC：讀取全部成本 ───────────────────────────────────
CREATE OR REPLACE FUNCTION admin_fetch_product_costs()
RETURNS TABLE (
  product_id UUID,
  cost NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.product_id, pc.cost
  FROM product_costs pc;
$$;

COMMENT ON FUNCTION admin_fetch_product_costs() IS '後台：讀取全部商品成本（繞過 RLS）';

GRANT EXECUTE ON FUNCTION admin_fetch_product_costs() TO anon, authenticated;

-- ── 後台 RPC：依商品 ID 批次讀取 ─────────────────────────────
CREATE OR REPLACE FUNCTION admin_fetch_product_costs_by_ids(p_product_ids UUID[])
RETURNS TABLE (
  product_id UUID,
  cost NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.product_id, pc.cost
  FROM product_costs pc
  WHERE pc.product_id = ANY (p_product_ids);
$$;

COMMENT ON FUNCTION admin_fetch_product_costs_by_ids(UUID[]) IS '後台：依商品 ID 批次讀取成本';

GRANT EXECUTE ON FUNCTION admin_fetch_product_costs_by_ids(UUID[]) TO anon, authenticated;

-- ── 後台 RPC：寫入／更新成本 ─────────────────────────────────
CREATE OR REPLACE FUNCTION admin_upsert_product_cost(
  p_product_id UUID,
  p_cost NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost NUMERIC;
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id 不可為空';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION '找不到商品';
  END IF;

  v_cost := GREATEST(0, COALESCE(p_cost, 0));

  INSERT INTO product_costs (product_id, cost, updated_at)
  VALUES (p_product_id, v_cost, now())
  ON CONFLICT (product_id) DO UPDATE
    SET cost = EXCLUDED.cost,
        updated_at = now();

  RETURN v_cost;
END;
$$;

COMMENT ON FUNCTION admin_upsert_product_cost(UUID, NUMERIC) IS '後台：寫入商品成本';

GRANT EXECUTE ON FUNCTION admin_upsert_product_cost(UUID, NUMERIC) TO anon, authenticated;
