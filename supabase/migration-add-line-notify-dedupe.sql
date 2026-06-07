-- 管理員通知去重（同一結帳批次／會員只通知一次）
CREATE TABLE IF NOT EXISTS line_notify_sent (
  dedupe_key TEXT PRIMARY KEY,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE line_notify_sent IS '管理員通知已送出事件（Email 等，避免重複通知）';

ALTER TABLE line_notify_sent ENABLE ROW LEVEL SECURITY;

-- 不建立 anon 政策：僅 service role（Edge Function）可寫入
