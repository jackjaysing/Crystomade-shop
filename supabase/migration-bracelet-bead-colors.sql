-- 珠材顏色類別（複選）：紅橙黃綠藍紫黑白（與商品水晶色標籤一致）
-- 於 Supabase SQL Editor 執行

ALTER TABLE bracelet_beads
  ADD COLUMN IF NOT EXISTS colors TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN bracelet_beads.colors IS '珠材顏色類別：紅橙黃綠藍紫黑白（可複選）';
