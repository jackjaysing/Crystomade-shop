-- ============================================================
-- 訂單軟刪除：deleted_at · 刪除前狀態 · 還庫存 / 恢復 RPC
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_from_status order_status;

COMMENT ON COLUMN orders.deleted_at IS '軟刪除時間；有值表示已從後台訂單列表移除';
COMMENT ON COLUMN orders.deleted_from_status IS '刪除當下訂單狀態快照（供恢復）';

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders (deleted_at DESC);

-- 軟刪除訂單群組（已出貨不可刪；待出貨會還庫存並標記 cancelled）
CREATE OR REPLACE FUNCTION soft_delete_order_group(p_order_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT id, product_id, status, deleted_at
    FROM orders
    WHERE id = ANY(p_order_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF r.deleted_at IS NOT NULL THEN
      CONTINUE;
    END IF;

    IF r.status = 'shipped'::order_status THEN
      RAISE EXCEPTION '已有出貨商品，無法刪除訂單';
    END IF;

    IF r.status = 'pending'::order_status THEN
      IF r.product_id IS NOT NULL THEN
        UPDATE products
        SET
          stock = stock + 1,
          status = CASE
            WHEN stock + 1 > 0 THEN 'available'::product_status
            ELSE status
          END
        WHERE id = r.product_id;
      END IF;

      UPDATE orders
      SET
        deleted_from_status = r.status,
        status = 'cancelled'::order_status,
        deleted_at = now()
      WHERE id = r.id;
    ELSE
      UPDATE orders
      SET
        deleted_from_status = r.status,
        deleted_at = now()
      WHERE id = r.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION '沒有可刪除的訂單（可能已刪除或已出貨）';
  END IF;

  RETURN v_count;
END;
$$;

-- 恢復已軟刪除訂單群組
CREATE OR REPLACE FUNCTION restore_order_group(p_order_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_stock INTEGER;
  v_count INTEGER := 0;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT id, product_id, status, deleted_at, deleted_from_status
    FROM orders
    WHERE id = ANY(p_order_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF r.deleted_at IS NULL THEN
      CONTINUE;
    END IF;

    IF r.deleted_from_status = 'pending'::order_status THEN
      IF r.product_id IS NOT NULL THEN
        SELECT stock INTO v_stock FROM products WHERE id = r.product_id FOR UPDATE;
        IF v_stock IS NULL OR v_stock < 1 THEN
          RAISE EXCEPTION '商品庫存不足，無法恢復待出貨訂單';
        END IF;

        UPDATE products
        SET
          stock = stock - 1,
          status = CASE
            WHEN stock - 1 <= 0 THEN 'sold'::product_status
            ELSE status
          END
        WHERE id = r.product_id;
      END IF;

      UPDATE orders
      SET
        status = 'pending'::order_status,
        deleted_at = NULL,
        deleted_from_status = NULL
      WHERE id = r.id;
    ELSE
      UPDATE orders
      SET
        status = COALESCE(r.deleted_from_status, r.status),
        deleted_at = NULL,
        deleted_from_status = NULL
      WHERE id = r.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION '沒有可恢復的訂單';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_order_group(UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION restore_order_group(UUID[]) TO anon, authenticated;

COMMENT ON FUNCTION soft_delete_order_group IS '後台軟刪除訂單群組（待出貨會還庫存）';
COMMENT ON FUNCTION restore_order_group IS '後台恢復已軟刪除訂單群組';
