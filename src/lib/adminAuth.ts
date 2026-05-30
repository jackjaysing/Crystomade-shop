/** 後台登入狀態（sessionStorage 鍵名） */
const ADMIN_SESSION_KEY = 'crystal_admin_authenticated'

/** 檢查是否已通過管理員驗證 */
export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
}

/** 驗證密碼並寫入 session */
export function loginAdmin(password: string, expected: string): boolean {
  if (!expected || password !== expected) {
    return false
  }
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
  return true
}

/** 登出後台 */
export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
}
