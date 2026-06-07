const WELCOME_POPUP_DISMISSED_KEY = 'crystal_welcome_popup_dismissed'

function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 訪客今日是否已關閉歡迎彈窗 */
export function isWelcomePopupDismissedToday(): boolean {
  try {
    return localStorage.getItem(WELCOME_POPUP_DISMISSED_KEY) === localDateKey()
  } catch {
    return false
  }
}

/** 記錄今日已關閉，當天內不再彈出 */
export function dismissWelcomePopupForToday(): void {
  try {
    localStorage.setItem(WELCOME_POPUP_DISMISSED_KEY, localDateKey())
  } catch {
    /* ignore private mode / quota */
  }
}
