import {
  ADMIN_ACCOUNTS,
  findAdminByPassword,
  type AdminRole,
} from '../constants/adminAccounts'

/** 後台登入狀態（sessionStorage 鍵名） */
const ADMIN_SESSION_KEY = 'crystal_admin_authenticated'
const ADMIN_NAME_KEY = 'crystal_admin_display_name'
const ADMIN_ROLE_KEY = 'crystal_admin_role'
const LEGACY_DISPLAY_NAME = '管理者'
const DEFAULT_ADMIN_ROLE: AdminRole = 'super'

function readEnv(
  name: 'VITE_ADMIN_PASSWORD' | 'VITE_ADMIN_DISPLAY_NAME' | 'VITE_ADMIN_ROLE'
): string {
  const raw = import.meta.env[name]
  return typeof raw === 'string' ? raw.trim() : ''
}

function parseAdminRole(raw: string | null | undefined): AdminRole {
  return raw === 'standard' ? 'standard' : 'super'
}

function persistAdminSession(displayName: string, role: AdminRole): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
  sessionStorage.setItem(ADMIN_NAME_KEY, displayName)
  sessionStorage.setItem(ADMIN_ROLE_KEY, role)
  window.dispatchEvent(new Event('admin-session-change'))
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

/** 目前登入的管理者角色 */
export function getAdminRole(): AdminRole {
  if (!isAdminAuthenticated()) return DEFAULT_ADMIN_ROLE

  const storedRole = sessionStorage.getItem(ADMIN_ROLE_KEY)
  if (storedRole === 'super' || storedRole === 'standard') return storedRole

  const displayName = sessionStorage.getItem(ADMIN_NAME_KEY)?.trim()
  const account = ADMIN_ACCOUNTS.find((item) => item.displayName === displayName)
  if (account) return account.role

  return DEFAULT_ADMIN_ROLE
}

/** 是否為高級管理員（可使用刪除／取消、收入統計、後台日誌） */
export function isSuperAdmin(): boolean {
  return getAdminRole() === 'super'
}

/** 驗證密碼並寫入 session */
export function loginAdmin(password: string): boolean {
  const account = findAdminByPassword(password)
  if (account) {
    persistAdminSession(account.displayName, account.role)
    return true
  }

  const envPassword = readEnv('VITE_ADMIN_PASSWORD')
  if (envPassword && password === envPassword) {
    const envRole = readEnv('VITE_ADMIN_ROLE')
    persistAdminSession(
      readEnv('VITE_ADMIN_DISPLAY_NAME') || LEGACY_DISPLAY_NAME,
      parseAdminRole(envRole || DEFAULT_ADMIN_ROLE)
    )
    return true
  }

  return false
}

/** 登出後台 */
export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  sessionStorage.removeItem(ADMIN_NAME_KEY)
  sessionStorage.removeItem(ADMIN_ROLE_KEY)
  window.dispatchEvent(new Event('admin-session-change'))
}
