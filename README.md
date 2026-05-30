# 晶刻 Crystomade · 天然水晶商用平台

React + Tailwind CSS + Supabase 打造的高質感水晶典藏網站，含買家前台與賣家後台。

## 功能概覽

| 模組 | 路徑 | 說明 |
|------|------|------|
| 買家前台 | `/products` | 深色精品 UI、瀑布流展示、功效標籤篩選、毛玻璃詳情與下單 |
| 賣家後台 | `/admin` | 密碼鎖、訂單一鍵出貨、商品上架與標記已售出 |

## 快速開始

### 1. 安裝依賴

```bash
cd crystal-luxury-shop
npm install
```

### 2. 設定 Supabase

1. 至 [supabase.com](https://supabase.com) 建立專案
2. 在 **SQL Editor** 執行 `supabase/schema.sql`
3. 在 **Storage** 確認已建立 `product-images` 公開桶
4. 複製 `.env.example` 為 `.env` 並填入：

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ADMIN_PASSWORD=你的後台密碼
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

瀏覽 `http://localhost:5173/products` 與 `http://localhost:5173/admin`。

## 專案結構

```
src/
├── lib/
│   ├── api/          # Supabase CRUD
│   ├── supabase.ts   # 客戶端設定
│   └── types.ts      # TypeScript 型別
├── constants/tags.ts # 功效標籤
├── hooks/            # 資料 hooks
├── components/
│   ├── products/     # 前台元件
│   ├── admin/        # 後台元件
│   └── ui/           # 共用 UI
└── pages/            # 路由頁面
supabase/schema.sql   # 資料庫 DDL + RLS
```

## 資料庫設計

### products

| 欄位 | 說明 |
|------|------|
| id | UUID 主鍵 |
| name | 商品名稱 |
| price | 價格 |
| tags | 功效標籤陣列 |
| image_url | 高清圖片 URL |
| status | `available` / `sold` |
| description | 詳細描述 |
| created_at | 上架時間 |

### orders

| 欄位 | 說明 |
|------|------|
| id | 訂單 ID |
| created_at | 下單時間 |
| buyer_name | 買家姓名 |
| phone | 聯絡電話 |
| address | 收件地址 |
| product_id | 商品 FK |
| total_amount | 總金額 |
| status | `pending` / `shipped` |

## 正式環境建議

- 後台請改用 **Supabase Auth** 或 **Edge Functions**，勿僅依賴前端密碼
- 收緊 RLS：禁止 anon 直接 UPDATE products/orders
- 為 Storage 上傳加上檔案大小與 MIME 限制

## 部署上線

請見 **[DEPLOY.md](./DEPLOY.md)**（Vercel / Netlify 步驟與環境變數設定）。

## 技術棧

- React 19 + TypeScript + Vite
- Tailwind CSS 3
- react-router-dom 7
- react-masonry-css
- @supabase/supabase-js
