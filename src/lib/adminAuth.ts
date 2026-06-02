import { findAdminByPassword } from '../constants/adminAccounts'

/** 後台登入狀態（sessionStorage 鍵名） */
const ADMIN_SESSION_KEY = 'crystal_admin_authenticated'
const ADMIN_NAME_KEY = 'crystal_admin_display_name'

/** 檢查是否已通過管理員驗證 */
export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
}

/** 目前登入的管理者顯示名稱 */
export function getAdminDisplayName(): string | null {
  if (!isAdminAuthenticated()) return null
  return sessionStorage.getItem(ADMIN_NAME_KEY)
}

/** 驗證密碼並寫入 session */
export function loginAdmin(password: string): boolean {
  const account = findAdminByPassword(password)
  if (!account) return false

  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
  sessionStorage.setItem(ADMIN_NAME_KEY, account.displayName)
  return true
}

/** 登出後台 */
export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  sessionStorage.removeItem(ADMIN_NAME_KEY)
}
