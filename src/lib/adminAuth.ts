import { findAdminByPassword } from '../constants/adminAccounts'

/** 後台登入狀態（sessionStorage 鍵名） */
const ADMIN_SESSION_KEY = 'crystal_admin_authenticated'
const ADMIN_NAME_KEY = 'crystal_admin_display_name'
const LEGACY_DISPLAY_NAME = '管理者'

function readEnv(name: 'VITE_ADMIN_PASSWORD' | 'VITE_ADMIN_DISPLAY_NAME'): string {
  const raw = import.meta.env[name]
  return typeof raw === 'string' ? raw.trim() : ''
}

function persistAdminSession(displayName: string): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
  sessionStorage.setItem(ADMIN_NAME_KEY, displayName)
}

/** 檢查是否已通過管理員驗證 */
export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
}

/** 目前登入的管理者顯示名稱 */
export function getAdminDisplayName(): string | null {
  if (!isAdminAuthenticated()) return null

  const stored = sessionStorage.getItem(ADMIN_NAME_KEY)?.trim()
  if (stored) return stored

  // 舊版僅寫入登入旗標、未存名稱的 session
  return LEGACY_DISPLAY_NAME
}

/** 驗證密碼並寫入 session */
export function loginAdmin(password: string): boolean {
  const account = findAdminByPassword(password)
  if (account) {
    persistAdminSession(account.displayName)
    return true
  }

  const envPassword = readEnv('VITE_ADMIN_PASSWORD')
  if (envPassword && password === envPassword) {
    persistAdminSession(readEnv('VITE_ADMIN_DISPLAY_NAME') || LEGACY_DISPLAY_NAME)
    return true
  }

  return false
}

/** 登出後台 */
export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  sessionStorage.removeItem(ADMIN_NAME_KEY)
}
