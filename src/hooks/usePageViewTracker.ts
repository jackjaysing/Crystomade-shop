import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { incrementPageView } from '../lib/api/analytics'
import { isSupabaseConfigured } from '../lib/supabase'

const DEBOUNCE_MS = 2000

/** 同頁短時間去重（React StrictMode 雙重 effect） */
const recentViews = new Map<string, number>()

/** 前台路由瀏覽計數（排除 /admin） */
export function usePageViewTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!isSupabaseConfigured || pathname.startsWith('/admin')) return

    const path = pathname === '/' ? '/products' : pathname
    const now = Date.now()
    const last = recentViews.get(path) ?? 0

    if (now - last < DEBOUNCE_MS) return

    recentViews.set(path, now)
    void incrementPageView()
  }, [pathname])
}
