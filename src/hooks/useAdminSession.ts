import { useCallback, useEffect, useState } from 'react'
import type { AdminRole } from '../constants/adminAccounts'
import {
  getAdminDisplayName,
  getAdminRole,
  isAdminAuthenticated,
  isSuperAdmin,
} from '../lib/adminAuth'

const ADMIN_SESSION_EVENT = 'admin-session-change'

/** 後台登入狀態（與 sessionStorage 同步） */
export function useAdminSession() {
  const [authed, setAuthed] = useState(isAdminAuthenticated)
  const [displayName, setDisplayName] = useState<string | null>(() =>
    isAdminAuthenticated() ? getAdminDisplayName() : null
  )
  const [role, setRole] = useState<AdminRole>(() =>
    isAdminAuthenticated() ? getAdminRole() : 'super'
  )
  const [superAdmin, setSuperAdmin] = useState(() =>
    isAdminAuthenticated() ? isSuperAdmin() : false
  )

  const refresh = useCallback(() => {
    const ok = isAdminAuthenticated()
    setAuthed(ok)
    setDisplayName(ok ? getAdminDisplayName() : null)
    setRole(ok ? getAdminRole() : 'super')
    setSuperAdmin(ok ? isSuperAdmin() : false)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(ADMIN_SESSION_EVENT, refresh)
    return () => window.removeEventListener(ADMIN_SESSION_EVENT, refresh)
  }, [refresh])

  return { authed, displayName, role, isSuperAdmin: superAdmin, refresh }
}
