import { useCallback, useEffect, useState } from 'react'
import { fetchQuickAddProducts } from '../lib/api/products'
import type { Product } from '../lib/types'

/** 購物車開啟時載入快捷加購推薦商品 */
export function useQuickAddProducts(enabled: boolean) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const data = await fetchQuickAddProducts()
      setProducts(data)
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
