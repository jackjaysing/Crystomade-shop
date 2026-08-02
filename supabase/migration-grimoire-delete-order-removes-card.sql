-- 刪除訂單後，對應魔導書／靈魂卡一併移除，且不再計入 VIP
-- 於 Supabase SQL Editor 執行（可重複執行）

-- ------------------------------------------------------------
-- 1) 軟刪除訂單：同步刪除靈魂卡
-- ------------------------------------------------------------
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

    -- 訂單刪除後魔導書一併消失
    DELETE FROM crystal_soul_cards WHERE order_id = r.id;

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
      -- 含已出貨：不還庫存，只軟刪並移除魔導書
      UPDATE orders
      SET
        deleted_from_status = r.status,
        deleted_at = now()
      WHERE id = r.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION '沒有可刪除的訂單（可能已刪除）';
  END IF;

  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 2) 清掉「訂單已刪、卡還在」的孤兒靈魂卡
-- ------------------------------------------------------------
DELETE FROM crystal_soul_cards c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.id = c.order_id
    AND o.deleted_at IS NOT NULL
);

-- ------------------------------------------------------------
-- 3) VIP 經驗值：排除已刪訂單
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
    AND o.deleted_at IS NULL
    AND o.status <> 'cancelled'
    AND (o.is_paid = true OR o.status = 'shipped');
$$;

CREATE OR REPLACE FUNCTION member_vip_xp_ledger(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  spend_date DATE,
  amount INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '無權限查詢其他會員的經驗累積紀錄';
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'Asia/Taipei')::date AS spend_date,
    SUM(
      CASE
        WHEN COALESCE(o.is_point_redemption, false) THEN 0
        ELSE GREATEST(0, ROUND(COALESCE(o.total_amount, 0))::INTEGER)
      END
    )::INTEGER AS amount
  FROM orders o
  WHERE o.user_id = p_user_id
    AND o.deleted_at IS NULL
    AND o.status <> 'cancelled'
    AND (o.is_paid = true OR o.status = 'shipped')
    AND COALESCE(o.is_point_redemption, false) = false
    AND COALESCE(o.total_amount, 0) > 0
  GROUP BY 1
  HAVING SUM(
    CASE
      WHEN COALESCE(o.is_point_redemption, false) THEN 0
      ELSE GREATEST(0, ROUND(COALESCE(o.total_amount, 0))::INTEGER)
    END
  ) > 0
  ORDER BY 1 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_order_group(UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_eligible_purchase_amount(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_vip_xp_ledger(UUID) TO anon, authenticated;
