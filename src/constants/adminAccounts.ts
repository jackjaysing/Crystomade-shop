/** 高級管理員：後台全部功能；一般管理員：不可刪除／取消、不可編輯會員點數、無收入統計與後台日誌 */
export type AdminRole = 'super' | 'standard'

export interface AdminAccount {
  password: string
  displayName: string
  role: AdminRole
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super: '高級管理員',
  standard: '一般管理員',
}

/** 後台管理者帳號（密碼對應顯示名稱與角色） */
export const ADMIN_ACCOUNTS: AdminAccount[] = [
  { password: 'su3g42841u04', displayName: 'RjGe阿杰哥', role: 'super' },
  { password: 'sakmjkmj781211', displayName: 'Shan', role: 'super' },
  { password: 'ken111009', displayName: 'Ken', role: 'super' },
  { password: 'zxcvbnm351135#', displayName: 'Johnman', role: 'standard' },
]

export function findAdminByPassword(password: string): AdminAccount | undefined {
  return ADMIN_ACCOUNTS.find((account) => account.password === password)
}
