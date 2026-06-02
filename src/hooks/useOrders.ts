import { useCallback, useEffect, useState } from 'react'
import { fetchOrders } from '../lib/api/orders'
import type { Order } from '../lib/types'

/** 訂單列表 hook（後台用） */
export function useOrders(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled) return
    if (!options?.silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchOrders()
      setOrders(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入訂單失敗')
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { orders, loading, error, reload, setOrders }
}
