import { useCallback, useEffect, useState } from 'react'
import { fetchDeletedProducts } from '../lib/api/products'
import { formatErrorMessage } from '../lib/formatError'
import type { Product } from '../lib/types'

/** 已刪除商品列表 hook */
export function useDeletedProducts(enabled: boolean) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDeletedProducts()
      setProducts(data)
    } catch (e) {
      setError(formatErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { products, loading, error, reload }
}
