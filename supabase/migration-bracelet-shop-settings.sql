-- 手串配置器全域設定（單列）
-- 於 Supabase SQL Editor 執行

CREATE TABLE IF NOT EXISTS bracelet_shop_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  beads_restocking BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE bracelet_shop_settings IS '手串配置器全域設定（僅一列）';
COMMENT ON COLUMN bracelet_shop_settings.beads_restocking IS '補貨中：前台自行配珠顯示補貨提示';

INSERT INTO bracelet_shop_settings (id, beads_restocking)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE bracelet_shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "公開讀取手串配置設定" ON bracelet_shop_settings;
DROP POLICY IF EXISTS "後台更新手串配置設定" ON bracelet_shop_settings;
DROP POLICY IF EXISTS "後台新增手串配置設定" ON bracelet_shop_settings;

CREATE POLICY "公開讀取手串配置設定"
ON bracelet_shop_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "後台更新手串配置設定"
ON bracelet_shop_settings FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "後台新增手串配置設定"
ON bracelet_shop_settings FOR INSERT
TO anon, authenticated
WITH CHECK (true);
