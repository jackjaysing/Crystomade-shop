# 晶刻 Crystomade · 上線部署指南

本專案為 **Vite + React**，建置後是靜態網站（`dist` 資料夾）。  
推薦使用 **Vercel**（步驟最少）；**Netlify** 亦可。

---

## 上線前準備

1. 確認本地 `npm run build` 能成功。
2. 準備好這三個值（與本地 `.env` 相同）：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`（`sb_publishable_` 開頭）
   - `VITE_ADMIN_PASSWORD`
3. 把專案推到 **GitHub**（不要上傳 `.env`，已在 `.gitignore`）。

---

## 方式一：Vercel（推薦）

### 1. 註冊與匯入

1. 打開 https://vercel.com 並用 GitHub 登入。
2. 點 **Add New → Project**。
3. 選擇你的 `crystal-luxury-shop` 倉庫 → **Import**。

### 2. 建置設定（通常自動偵測）

| 項目 | 值 |
|------|-----|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

專案已含 `vercel.json`，一般不用改。

### 3. 設定環境變數（重要）

在 **Environment Variables** 新增：

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://iuwvzphyalhvlbwttzfc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 你的可發布金鑰 |
| `VITE_ADMIN_PASSWORD` | 你的後台密碼 |

三個都要勾選 **Production**（以及 Preview 若需要）。

> Vite 只會打包 `VITE_` 開頭的變數；改完變數後要在 Vercel 重新 Deploy 一次。

### 4. 部署

點 **Deploy**，約 1～2 分鐘完成。  
會得到網址如：`https://你的專案名.vercel.app`

### 5. 驗證

- 打開 `https://xxx.vercel.app/products` 應能看到商品。
- 打開 `https://xxx.vercel.app/admin` 用後台密碼登入。

---

## 方式二：Netlify

### 1. 匯入專案

1. 打開 https://app.netlify.com 並登入。
2. **Add new site → Import an existing project** → 連 GitHub → 選倉庫。

### 2. 建置設定

| 項目 | 值 |
|------|-----|
| Build command | `npm run build` |
| Publish directory | `dist` |

專案已含 `netlify.toml`，通常會自動帶入。

### 3. 環境變數

**Site configuration → Environment variables → Add variable**，加入與 Vercel 相同的三個 `VITE_*` 變數。

### 4. 部署

點 **Deploy site**。完成後網址如：`https://隨機名稱.netlify.app`

---

## 環境變數說明

| 變數 | 說明 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | 可發布金鑰（勿用 secret 金鑰） |
| `VITE_ADMIN_PASSWORD` | 後台登入密碼（會被打進前端，僅適合簡易管理） |

本地開發用 `.env`；**線上不讀你電腦的 `.env`**，必須在 Vercel / Netlify 後台手動填寫。

---

## 更新網站

程式 push 到 GitHub 後，Vercel / Netlify 通常會 **自動重新部署**。  
若改了環境變數，請在後台點 **Redeploy**。

---

## 常見問題

### 打開網址是白的，或重新整理 /products 變 404

- 確認已部署最新版（含 `vercel.json` 或 `netlify.toml`）。
- Vercel / Netlify 重新 Deploy 一次。

### 線上顯示無法連線 Supabase

- 檢查三個 `VITE_*` 是否填對、無多餘空格。
- 確認 Supabase 專案為 **Healthy**（非 Paused）。
- 重新 Deploy。

### 後台密碼在線上無效

- 確認 `VITE_ADMIN_PASSWORD` 已在平台設定並重新部署。

---

## Email 管理員通知（選用）

有人**下單**或**註冊會員**時，自動寄信到 **Crystomade@gmail.com**（可改 `ADMIN_NOTIFY_EMAIL`）。

1. 至 [Resend](https://resend.com) 註冊並建立 API Key。
2. 在 Supabase SQL Editor 執行 `supabase/migration-add-line-notify-dedupe.sql`。
3. 部署 Edge Function `admin-email-notify` 並設定 secrets（詳見 `supabase/functions/admin-email-notify/README.txt`）。
4. 在 Supabase **Database → Webhooks** 為 `orders`、`member_profiles` 的 **Insert** 事件指向該 Function。

```bash
supabase secrets set RESEND_API_KEY=re_你的金鑰
supabase secrets set ADMIN_NOTIFY_EMAIL=Crystomade@gmail.com
supabase secrets set ADMIN_EMAIL_WEBHOOK_SECRET=自訂長密碼
supabase functions deploy admin-email-notify
```

> `RESEND_API_KEY` 只能放在 Supabase secrets，**不要**寫進 `VITE_` 或前端。

---

## 自訂網域（選用）

- **Vercel**：Project → Settings → Domains  
- **Netlify**：Domain management → Add domain  

依照畫面設定 DNS 即可。
