import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchProductViewStats } from '../lib/api/analytics'
import type { ProductViewStats } from '../lib/api/analytics'

/** 後台各商品瀏覽次數統計 */
export function useProductViewStats(enabled: boolean) {
  const [stats, setStats] = useState<ProductViewStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProductViewStats()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入商品瀏覽統計失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  const statsByProductId = useMemo(() => {
    const map = new Map<string, ProductViewStats>()
    for (const item of stats) {
      map.set(item.productId, item)
    }
    return map
  }, [stats])

  return { stats, statsByProductId, loading, error, reload }
}
