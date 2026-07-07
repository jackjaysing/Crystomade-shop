-- 修復刪除訂單時觸發器報錯：invalid input value for enum order_status: ""
-- 原因：orders_soul_card_trigger_fn 使用 COALESCE(OLD.status, '')，PL/pgSQL 不短路布林式，'' 無法轉成 enum
-- 於 Supabase SQL Editor 執行（可重複執行）

CREATE OR REPLACE FUNCTION orders_soul_card_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NOT NULL
       AND NEW.status <> 'cancelled'
       AND COALESCE(NEW.is_point_redemption, false) = false
       AND (NEW.is_paid = true OR NEW.status = 'shipped')
       AND (
         (NEW.is_paid = true AND COALESCE(OLD.is_paid, false) IS DISTINCT FROM true)
         OR (
           NEW.status = 'shipped'::order_status
           AND OLD.status IS DISTINCT FROM 'shipped'::order_status
         )
       ) THEN
      PERFORM issue_crystal_soul_card_for_order(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_soul_card_trigger ON orders;
CREATE TRIGGER orders_soul_card_trigger
  AFTER UPDATE OF is_paid, status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_soul_card_trigger_fn();
