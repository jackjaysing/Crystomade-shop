-- 抽獎活動：報名、截止後隨機抽出 1 名
-- 於 Supabase SQL Editor 執行整段（可重複執行）

CREATE TABLE IF NOT EXISTS raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  registration_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'drawn', 'cancelled')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  winner_user_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raffles_active_deadline
  ON raffles (is_active, status, registration_deadline DESC);

COMMENT ON TABLE raffles IS '抽獎活動';

CREATE TABLE IF NOT EXISTS raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (raffle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_raffle_entries_raffle
  ON raffle_entries (raffle_id, entered_at);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "讀取抽獎活動" ON raffles;
CREATE POLICY "讀取抽獎活動"
ON raffles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "後台寫入抽獎活動" ON raffles;
CREATE POLICY "後台寫入抽獎活動"
ON raffles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "後台更新抽獎活動" ON raffles;
CREATE POLICY "後台更新抽獎活動"
ON raffles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "後台刪除抽獎活動" ON raffles;
CREATE POLICY "後台刪除抽獎活動"
ON raffles FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "讀取抽獎報名" ON raffle_entries;
CREATE POLICY "讀取抽獎報名"
ON raffle_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "寫入抽獎報名" ON raffle_entries;
CREATE POLICY "寫入抽獎報名"
ON raffle_entries FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ------------------------------------------------------------
-- 截止後隨機抽出 1 名（可重複呼叫，已抽出則略過）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION finalize_raffle_draw(p_raffle_id UUID)
RETURNS raffles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle raffles;
  v_winner UUID;
BEGIN
  SELECT * INTO v_raffle FROM raffles WHERE id = p_raffle_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到抽獎活動';
  END IF;

  IF v_raffle.status = 'drawn' THEN
    RETURN v_raffle;
  END IF;

  IF v_raffle.status = 'cancelled' THEN
    RAISE EXCEPTION '此抽獎活動已取消';
  END IF;

  IF now() < v_raffle.registration_deadline THEN
    RAISE EXCEPTION '報名尚未截止，無法抽獎';
  END IF;

  SELECT re.user_id INTO v_winner
  FROM raffle_entries re
  WHERE re.raffle_id = p_raffle_id
  ORDER BY random()
  LIMIT 1;

  IF v_winner IS NULL THEN
    UPDATE raffles
    SET status = 'drawn',
        drawn_at = now(),
        updated_at = now()
    WHERE id = p_raffle_id
    RETURNING * INTO v_raffle;
    RETURN v_raffle;
  END IF;

  UPDATE raffles
  SET status = 'drawn',
      winner_user_id = v_winner,
      drawn_at = now(),
      updated_at = now()
  WHERE id = p_raffle_id
  RETURNING * INTO v_raffle;

  RETURN v_raffle;
END;
$$;

-- 批次處理已截止且未抽出的活動
CREATE OR REPLACE FUNCTION finalize_overdue_raffles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT id FROM raffles
    WHERE status = 'open'
      AND is_active = true
      AND registration_deadline <= now()
  LOOP
    PERFORM finalize_raffle_draw(v_row.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 會員報名
CREATE OR REPLACE FUNCTION register_for_raffle(
  p_raffle_id UUID,
  p_user_id UUID
)
RETURNS raffle_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle raffles;
  v_entry raffle_entries;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION '請先登入會員';
  END IF;

  SELECT * INTO v_raffle FROM raffles WHERE id = p_raffle_id;
  IF NOT FOUND OR NOT v_raffle.is_active THEN
    RAISE EXCEPTION '抽獎活動不存在或已關閉';
  END IF;

  IF v_raffle.status <> 'open' THEN
    RAISE EXCEPTION '此抽獎活動已結束報名';
  END IF;

  IF now() >= v_raffle.registration_deadline THEN
    PERFORM finalize_raffle_draw(p_raffle_id);
    RAISE EXCEPTION '報名已截止';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM member_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION '找不到會員資料';
  END IF;

  IF EXISTS (
    SELECT 1 FROM raffle_entries
    WHERE raffle_id = p_raffle_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION '您已報名過此活動';
  END IF;

  INSERT INTO raffle_entries (raffle_id, user_id)
  VALUES (p_raffle_id, p_user_id)
  RETURNING * INTO v_entry;

  RETURN v_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_raffle_draw(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION finalize_overdue_raffles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_for_raffle(UUID, UUID) TO anon, authenticated;
