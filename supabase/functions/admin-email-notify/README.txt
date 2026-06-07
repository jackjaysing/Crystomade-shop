晶刻 · Email 管理員通知

【功能】
有人下單或註冊會員時，自動寄信到 Crystomade@gmail.com（或自訂 ADMIN_NOTIFY_EMAIL）。

【寄信服務】Resend（https://resend.com）
- 免費額度足夠小店通知用量
- 註冊後到 API Keys 建立金鑰

【設定步驟】

1) Supabase SQL Editor 執行
   migration-add-line-notify-dedupe.sql
   （資料表名稱沿用 line_notify_sent，僅作去重用）

2) Resend 註冊並建立 API Key
   https://resend.com/api-keys

3) Supabase secrets
   supabase secrets set RESEND_API_KEY=re_你的金鑰
   supabase secrets set ADMIN_NOTIFY_EMAIL=Crystomade@gmail.com
   supabase secrets set ADMIN_EMAIL_WEBHOOK_SECRET=自訂一組長密碼
   （選填）supabase secrets set EMAIL_FROM="Crystomade <onboarding@resend.dev>"

4) 部署 Edge Function
   supabase functions deploy admin-email-notify

5) Database Webhooks（Supabase → Database → Webhooks）

   Hook A：orders · Insert
   Hook B：member_profiles · Insert

   URL（兩個相同）：
   https://你的專案.supabase.co/functions/v1/admin-email-notify

   Headers：
   Authorization: Bearer 你的_SUPABASE_ANON_KEY
   x-admin-email-secret: 與 ADMIN_EMAIL_WEBHOOK_SECRET 相同
   Content-Type: application/json

6) 測試
   前台下一筆測試訂單或註冊，幾秒內應收到 Email。
   若沒收到，到 Resend Dashboard → Logs 查看原因。

【Resend 免費版注意】
- 未驗證網域時，寄件人預設為 onboarding@resend.dev
- 免費測試期可能僅能寄到 Resend 帳號同信箱；要穩定寄到 Crystomade@gmail.com，
  建議在 Resend 新增並驗證你的網域，或將 Resend 帳號註冊為 Crystomade@gmail.com

【注意】
- API Key 僅放 Supabase secrets，勿寫入 VITE_ 或前端。
