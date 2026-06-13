/** 將各種錯誤轉成使用者可讀的中文訊息 */
export function formatErrorMessage(err: unknown): string {
  if (!err) return '載入商品失敗'

  if (err instanceof Error) {
    const msg = err.message

    if (/fetch failed|Failed to fetch|NetworkError/i.test(msg)) {
      return '無法連線資料服務，請稍後再試或聯繫官方 LINE'
    }

    if (/Legacy API keys|legacy api/i.test(msg)) {
      return 'Supabase 已停用舊版金鑰，請在 .env 使用 sb_publishable_ 開頭的可發布金鑰'
    }

    if (/JWT|Invalid API key|invalid api key/i.test(msg)) {
      return 'API 金鑰無效，請到 Supabase → Settings → API 重新複製可發布金鑰'
    }

    if (/relation.*products.*does not exist|PGRST205/i.test(msg)) {
      return '找不到 products 資料表，請在 Supabase SQL Editor 執行 schema.sql'
    }

    if (/503|paused|not available/i.test(msg)) {
      return (
        'API 回傳 503。若 Dashboard 已是 Healthy，幾乎一定是 .env 的 Project URL 填到「另一個專案」。' +
        '請打開「目前 Healthy 的那個專案」→ Settings → API → 複製 Project URL 與 Publishable key → 更新 EDIT-ME-SUPABASE-KEYS.txt → SYNC-ENV.bat → 重啟 dev'
      )
    }

    return msg
  }

  if (typeof err === 'object' && err !== null && 'message' in err) {
    return formatErrorMessage(new Error(String((err as { message: unknown }).message)))
  }

  return String(err)
}
