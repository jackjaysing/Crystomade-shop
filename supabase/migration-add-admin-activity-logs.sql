-- ============================================================
-- 後台操作日誌：記錄管理者與變更內容
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  summary TEXT NOT NULL
);

COMMENT ON TABLE admin_activity_logs IS '後台管理者操作紀錄';
COMMENT ON COLUMN admin_activity_logs.action IS 'create | update | delete | restore | sort | status';
COMMENT ON COLUMN admin_activity_logs.entity_type IS 'product | order | banner';

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created
  ON admin_activity_logs (created_at DESC);

ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "讀取後台日誌" ON admin_activity_logs;
CREATE POLICY "讀取後台日誌"
  ON admin_activity_logs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "寫入後台日誌" ON admin_activity_logs;
CREATE POLICY "寫入後台日誌"
  ON admin_activity_logs FOR INSERT
  WITH CHECK (true);
