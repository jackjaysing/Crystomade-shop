-- 新增品類「配飾」與細項（手鐲、手排、墜鍊、戒指）
-- 在 Supabase SQL Editor 執行一次即可

ALTER TYPE product_category ADD VALUE IF NOT EXISTS '配飾';

COMMENT ON COLUMN products.category IS '品類：手串、配飾、擺件、礦石';

COMMENT ON COLUMN products.subcategory IS
  '配飾：手鐲、手排、墜鍊、戒指；擺件：龍龜、貔貅、原礦、其他；礦石：原石、晶鎮、晶球、晶洞、碎石；手串為 NULL';
