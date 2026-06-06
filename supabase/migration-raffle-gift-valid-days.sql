-- 抽獎禮物券：發放後 30 日內有效（expires_at 於 admin_issue_coupon_to_member 發券當下計算）
-- 於 Supabase SQL Editor 執行

UPDATE coupons
SET valid_days = 30,
    updated_at = now()
WHERE source_raffle_id IS NOT NULL
  AND (valid_days IS NULL OR valid_days <> 30);
