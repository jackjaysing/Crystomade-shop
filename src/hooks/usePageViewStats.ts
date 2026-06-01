import { useCallback, useEffect, useState } from 'react'
import { fetchPageViewStats } from '../lib/api/analytics'
import type { PageViewStats } from '../lib/api/analytics'

/** 後台瀏覽次數統計 */
export function usePageViewStats(enabled: boolean) {
  const [stats, setStats] = useState<PageViewStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPageViewStats()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入瀏覽統計失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { stats, loading, error, reload }
}
