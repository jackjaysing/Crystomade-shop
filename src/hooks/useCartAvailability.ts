import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { fetchProducts } from '../lib/api/products'
import {
  buildProductMap,
  calcCheckoutTotals,
  resolveCartItems,
  toCheckoutItems,
  type ResolvedCartItem,
} from '../lib/cartAvailability'
import type { CartItem, Product } from '../lib/types'

interface UseCartAvailabilityOptions {
  /** 是否拉取最新庫存（例如 Drawer 開啟或結帳頁） */
  enabled?: boolean
}

interface CartAvailabilitySnapshot {
  resolvedItems: ResolvedCartItem[]
  checkoutItems: CartItem[]
  checkoutItemCount: number
  hasSnatchedItems: boolean
  subtotal: number
  shippingFee: number
  grandTotal: number
}

function buildSnapshot(items: CartItem[], products: Product[]): CartAvailabilitySnapshot {
  const productMap = buildProductMap(products)
  const resolvedItems = resolveCartItems(items, productMap)
  const checkoutItems = toCheckoutItems(resolvedItems)
  const checkoutItemCount = checkoutItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  )
  const hasSnatchedItems = resolvedItems.some((entry) => entry.snatchedQuantity > 0)
  const totals = calcCheckoutTotals(checkoutItems)

  return {
    resolvedItems,
    checkoutItems,
    checkoutItemCount,
    hasSnatchedItems,
    ...totals,
  }
}

/** 購物車品項與即時庫存比對 */
export function useCartAvailability(options: UseCartAvailabilityOptions = {}) {
  const { items } = useCart()
  const enabled = options.enabled ?? items.length > 0

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<CartAvailabilitySnapshot | null> => {
    if (items.length === 0) {
      setProducts([])
      return null
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts()
      setProducts(data)
      return buildSnapshot(items, data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法更新庫存狀態')
      return null
    } finally {
      setLoading(false)
    }
  }, [items])

  useEffect(() => {
    if (enabled && items.length > 0) {
      refresh()
    }
  }, [enabled, items.length, refresh])

  const snapshot = useMemo(
    () => buildSnapshot(items, products),
    [items, products]
  )

  return {
    ...snapshot,
    loading,
    error,
    refresh,
  }
}
