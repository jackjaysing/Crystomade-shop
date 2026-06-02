export interface AdminAccount {
  password: string
  displayName: string
}

/** 後台管理者帳號（密碼對應顯示名稱） */
export const ADMIN_ACCOUNTS: AdminAccount[] = [
  { password: 'su3g42841u04', displayName: 'RjGe阿杰哥' },
  { password: 'sakmjkmj781211', displayName: 'Shan' },
]

export function findAdminByPassword(password: string): AdminAccount | undefined {
  return ADMIN_ACCOUNTS.find((account) => account.password === password)
}
