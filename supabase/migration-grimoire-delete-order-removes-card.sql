-- 刪除訂單後，對應魔導書／靈魂卡一併移除，且不再計入 VIP
-- 於 Supabase SQL Editor 執行（可重複執行）
--
-- 注意：本檔不再覆寫 soft_delete_order_group（避免拿掉退／扣點）。
-- 點數處理請執行：
--   migration-soft-delete-refund-points.sql
--   或較新的 migration-fix-soft-delete-points-clawback.sql
--   （含規格庫存時再搭配 migration-product-variants.sql）

-- ------------------------------------------------------------
-- 1) 清掉「訂單已刪、卡還在」的孤兒靈魂卡
-- ------------------------------------------------------------
DELETE FROM crystal_soul_cards c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.id = c.order_id
    AND o.deleted_at IS NOT NULL
);

-- ------------------------------------------------------------
-- 2) VIP 經驗值：排除已刪訂單
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

GRANT EXECUTE ON FUNCTION member_eligible_purchase_amount(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION member_vip_xp_ledger(UUID) TO anon, authenticated;
