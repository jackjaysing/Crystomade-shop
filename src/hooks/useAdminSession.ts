import { useCallback, useEffect, useState } from 'react'
import {
  getAdminDisplayName,
  isAdminAuthenticated,
} from '../lib/adminAuth'

const ADMIN_SESSION_EVENT = 'admin-session-change'

/** 後台登入狀態（與 sessionStorage 同步） */
export function useAdminSession() {
  const [authed, setAuthed] = useState(isAdminAuthenticated)
  const [displayName, setDisplayName] = useState<string | null>(() =>
    isAdminAuthenticated() ? getAdminDisplayName() : null
  )

  const refresh = useCallback(() => {
    const ok = isAdminAuthenticated()
    setAuthed(ok)
    setDisplayName(ok ? getAdminDisplayName() : null)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(ADMIN_SESSION_EVENT, refresh)
    return () => window.removeEventListener(ADMIN_SESSION_EVENT, refresh)
  }, [refresh])

  return { authed, displayName, refresh }
}
