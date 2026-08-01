import { useCallback, useEffect, useState } from 'react'
import { fetchOrders } from '../lib/api/orders'
import type { Order } from '../lib/types'

/** 訂單列表 hook（後台用） */
export function useOrders(enabled: boolean, options?: { includeCosts?: boolean }) {
  const includeCosts = Boolean(options?.includeCosts)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (reloadOptions?: { silent?: boolean }) => {
    if (!enabled) return
    if (!reloadOptions?.silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchOrders({ includeCosts })
      setOrders(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入訂單失敗')
    } finally {
      if (!reloadOptions?.silent) setLoading(false)
    }
  }, [enabled, includeCosts])

  useEffect(() => {
    reload()
  }, [reload])

  return { orders, loading, error, reload, setOrders }
}
