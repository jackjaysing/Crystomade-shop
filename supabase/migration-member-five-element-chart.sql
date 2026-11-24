-- 會員五行命盤（後台點選儲存）
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS five_element_chart jsonb NULL;

COMMENT ON COLUMN member_profiles.five_element_chart IS
  '後台五行命盤：natal/composite（各最多 3）、balance/reduce（含強度）、note；缺由前端推導';
