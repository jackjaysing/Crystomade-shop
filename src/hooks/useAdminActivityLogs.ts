import { useCallback, useEffect, useState } from 'react'
import { fetchAdminActivityLogs, type AdminActivityLog } from '../lib/api/adminActivityLog'

/** 後台操作日誌 */
export function useAdminActivityLogs(enabled: boolean) {
  const [logs, setLogs] = useState<AdminActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminActivityLogs()
      setLogs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入後台日誌失敗')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) reload()
  }, [enabled, reload])

  return { logs, loading, error, reload }
}
