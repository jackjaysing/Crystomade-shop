import { useEffect } from 'react'
import { incrementProductView } from '../lib/api/analytics'
import { isSupabaseConfigured } from '../lib/supabase'

const DEBOUNCE_MS = 2000

/** 同商品短時間去重（React StrictMode 雙重 effect） */
const recentProductViews = new Map<string, number>()

/** 商品詳情開啟時記錄瀏覽 */
export function useProductViewTracker(productId: string | undefined) {
  useEffect(() => {
    if (!productId || !isSupabaseConfigured) return

    const now = Date.now()
    const last = recentProductViews.get(productId) ?? 0

    if (now - last < DEBOUNCE_MS) return

    recentProductViews.set(productId, now)
    void incrementProductView(productId)
  }, [productId])
}
