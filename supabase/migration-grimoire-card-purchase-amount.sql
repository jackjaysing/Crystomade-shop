-- 魔導書單本經驗值：對應訂單「實付」金額（點數折抵已扣；點數兌換＝0）
-- 建議改跑更新版：migration-grimoire-vip-cash-only-xp.sql
-- 於 Supabase SQL Editor 執行（可重複執行）

ALTER TABLE crystal_soul_cards
  ADD COLUMN IF NOT EXISTS purchase_amount INTEGER;

COMMENT ON COLUMN crystal_soul_cards.purchase_amount IS
  '單本經驗值＝訂單實付金額（點數折抵已扣；點數兌換＝0）';

UPDATE crystal_soul_cards c
SET purchase_amount = CASE
  WHEN COALESCE(o.is_point_redemption, false) THEN 0
  ELSE GREATEST(0, ROUND(COALESCE(o.total_amount, 0))::INTEGER)
END
FROM orders o
WHERE o.id = c.order_id;

CREATE OR REPLACE FUNCTION crystal_soul_cards_set_purchase_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount INTEGER;
  v_is_redemption BOOLEAN;
BEGIN
  SELECT
    GREATEST(0, ROUND(COALESCE(total_amount, 0))::INTEGER),
    COALESCE(is_point_redemption, false)
  INTO v_amount, v_is_redemption
  FROM orders
  WHERE id = NEW.order_id;

  IF COALESCE(v_is_redemption, false) THEN
    NEW.purchase_amount := 0;
  ELSE
    NEW.purchase_amount := COALESCE(v_amount, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crystal_soul_cards_purchase_amount_bi ON crystal_soul_cards;
CREATE TRIGGER crystal_soul_cards_purchase_amount_bi
  BEFORE INSERT ON crystal_soul_cards
  FOR EACH ROW
  EXECUTE FUNCTION crystal_soul_cards_set_purchase_amount();
