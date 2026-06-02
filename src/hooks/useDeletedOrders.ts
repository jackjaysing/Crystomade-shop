import { useCallback, useEffect, useState } from 'react'
import { fetchDeletedOrders } from '../lib/api/orders'
import type { Order } from '../lib/types'

/** 已軟刪除訂單列表（後台用） */
export function useDeletedOrders(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDeletedOrders()
      setOrders(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入已刪除訂單失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { orders, loading, error, reload }
}
