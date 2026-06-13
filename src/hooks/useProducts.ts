import { useCallback, useEffect, useState } from 'react'
import { fetchProducts } from '../lib/api/products'
import { formatErrorMessage } from '../lib/formatError'
import type { Product } from '../lib/types'

/** 商品列表資料 hook（支援手動重新整理） */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts({ bypassCache: true })
      setProducts(data)
    } catch (e) {
      setError(formatErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { products, loading, error, reload }
}
