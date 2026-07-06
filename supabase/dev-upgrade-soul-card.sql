-- 開發測試：手動將指定靈魂卡升級至滿級（Supabase SQL Editor 執行）
-- 替換下方 card id 後執行

UPDATE crystal_soul_cards
SET
  magic_status = 'resonating',
  energy_level = 100,
  contract_signed_at = COALESCE(contract_signed_at, now()),
  contract_signer_name = COALESCE(contract_signer_name, '測試守護者'),
  awakened_at = COALESCE(awakened_at, now()),
  last_purify_at = now(),
  last_moon_charge_at = now(),
  last_meditation_at = now()
WHERE id = 'dd9bbc17-71ad-4e40-a322-168fa731e6e1'
RETURNING id, magic_title, magic_status, energy_level, contract_signed_at;
