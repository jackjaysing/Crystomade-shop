import { useCallback, useEffect, useState } from 'react'
import { fetchActivePointProducts } from '../lib/api/pointProducts'
import type { PointProduct } from '../lib/types'

export function usePointProducts(enabled = true) {
  const [products, setProducts] = useState<PointProduct[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setProducts(await fetchActivePointProducts())
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  return { products, loading, reload }
}
