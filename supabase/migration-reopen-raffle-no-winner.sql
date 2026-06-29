-- 無人中獎的抽獎：重新開放報名（Supabase SQL Editor 執行）

CREATE OR REPLACE FUNCTION reopen_raffle_registration(
  p_raffle_id UUID,
  p_registration_deadline TIMESTAMPTZ
)
RETURNS raffles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle raffles;
BEGIN
  SELECT * INTO v_raffle FROM raffles WHERE id = p_raffle_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到抽獎活動';
  END IF;

  IF v_raffle.status <> 'drawn' THEN
    RAISE EXCEPTION '僅已結束且無得主的抽獎可重新開放報名';
  END IF;

  IF v_raffle.winner_user_id IS NOT NULL THEN
    RAISE EXCEPTION '已有中獎者，無法重新開放報名';
  END IF;

  IF p_registration_deadline IS NULL OR p_registration_deadline <= now() THEN
    RAISE EXCEPTION '請設定晚於現在的報名截止時間';
  END IF;

  UPDATE raffles
  SET
    status = 'open',
    winner_user_id = NULL,
    drawn_at = NULL,
    registration_deadline = p_registration_deadline,
    is_active = true,
    updated_at = now()
  WHERE id = p_raffle_id
  RETURNING * INTO v_raffle;

  RETURN v_raffle;
END;
$$;

GRANT EXECUTE ON FUNCTION reopen_raffle_registration(UUID, TIMESTAMPTZ) TO anon, authenticated;
