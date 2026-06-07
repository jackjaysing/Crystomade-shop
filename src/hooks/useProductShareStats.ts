import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchProductShareStats } from '../lib/api/analytics'
import type { ProductShareStats } from '../lib/api/analytics'

/** 後台各商品分享次數統計 */
export function useProductShareStats(enabled: boolean) {
  const [stats, setStats] = useState<ProductShareStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProductShareStats()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入商品分享統計失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  const statsByProductId = useMemo(() => {
    const map = new Map<string, ProductShareStats>()
    for (const item of stats) {
      map.set(item.productId, item)
    }
    return map
  }, [stats])

  return { stats, statsByProductId, loading, error, reload }
}
