import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  dismissWelcomePopupForToday,
  isWelcomePopupDismissedToday,
} from '../lib/welcomePopupDismiss'

const POPUP_DELAY_MS = 3000

/** 首頁訪客：延遲 3 秒顯示註冊歡迎彈窗 */
export function useWelcomeRegisterPopup(enabled = true) {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled || loading || user) {
      setOpen(false)
      return
    }
    if (isWelcomePopupDismissedToday()) return

    const timer = window.setTimeout(() => {
      if (!isWelcomePopupDismissedToday()) setOpen(true)
    }, POPUP_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [enabled, loading, user])

  const dismiss = useCallback(() => {
    dismissWelcomePopupForToday()
    setOpen(false)
  }, [])

  return { open, dismiss }
}
