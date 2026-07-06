-- 後台：讀取靈魂卡（計算魔法師等級、生日禮資格）
-- ⚠️ 已由 migration-admin-soul-cards-rpc.sql 取代（改用 RPC，不再開放全表 SELECT）
-- 若你尚未執行新版，請改執行 migration-admin-soul-cards-rpc.sql

DROP POLICY IF EXISTS "後台讀取全部靈魂卡" ON crystal_soul_cards;
