import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchProducts } from '../lib/api/products'
import { formatErrorMessage } from '../lib/formatError'
import { isProductActive } from '../lib/productStock'
import type { Product } from '../lib/types'

interface UseStorefrontProductsOptions {
  /** 回到分頁時自動重新載入（後台刪除後前台同步） */
  refetchOnFocus?: boolean
}

/** 前台典藏商品 hook（排除已刪除物品） */
export function useStorefrontProducts(options: UseStorefrontProductsOptions = {}) {
  const { refetchOnFocus = true } = options
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts()
      setProducts(data.filter(isProductActive))
    } catch (e) {
      setError(formatErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!refetchOnFocus) return

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        reload()
      }
    }

    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', handleVisible)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [refetchOnFocus, reload])

  const activeProducts = useMemo(
    () => products.filter(isProductActive),
    [products]
  )

  return { products: activeProducts, loading, error, reload }
}
