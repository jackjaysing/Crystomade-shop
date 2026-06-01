-- ============================================================
-- 取消訂單：order_status 新增 cancelled · 還庫存 RPC
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';

CREATE OR REPLACE FUNCTION cancel_order_group(p_order_ids UUID[])
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
    SELECT id, product_id, status
    FROM orders
    WHERE id = ANY(p_order_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF r.status = 'shipped'::order_status THEN
      RAISE EXCEPTION '已有出貨商品，無法取消訂單';
    END IF;

    IF r.status = 'cancelled'::order_status THEN
      CONTINUE;
    END IF;

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
    SET status = 'cancelled'::order_status
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION '沒有可取消的訂單（可能已全部取消）';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_order_group(UUID[]) TO anon, authenticated;

COMMENT ON FUNCTION cancel_order_group IS '後台取消訂單群組：標記 cancelled 並還原商品庫存';
