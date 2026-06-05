import { useCallback, useEffect, useState } from 'react'
import { fetchPageViewTimeSlotStats } from '../lib/api/analytics'
import type { PageViewTimeSlot } from '../lib/api/analytics'

/** 後台瀏覽時段統計（週幾 × 小時） */
export function usePageViewTimeSlotStats(enabled: boolean) {
  const [slots, setSlots] = useState<PageViewTimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPageViewTimeSlotStats()
      setSlots(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入瀏覽時段統計失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { slots, loading, error, reload }
}
