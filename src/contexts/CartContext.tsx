import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  buildCartItemKey,
  productRequiresBraceletSize,
} from '../constants/braceletSizes'
import { calcGrandTotal, calcShippingFee, calcSubtotal } from '../lib/cartShipping'
import { getProductSalePrice } from '../lib/productPricing'
import type { CartItem, Product } from '../lib/types'

const STORAGE_KEY = 'crystomade-cart'

export interface AddToCartOptions {
  quantity?: number
  selectedSize?: string | null
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  shippingFee: number
  grandTotal: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (product: Product, options?: AddToCartOptions) => void
  removeItem: (cartItemKey: string) => void
  updateQuantity: (cartItemKey: string, quantity: number) => void
  /** 變更手串手圍（會依新規格合併或拆列） */
  updateItemSize: (cartItemKey: string, newSelectedSize: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function normalizeStoredItem(raw: CartItem): CartItem | null {
  if (!raw || typeof raw.productId !== 'string' || typeof raw.quantity !== 'number') {
    return null
  }
  if (raw.quantity <= 0) return null

  const selectedSize =
    raw.selectedSize != null && String(raw.selectedSize).trim()
      ? String(raw.selectedSize).trim()
      : null
  const cartItemKey =
    typeof raw.cartItemKey === 'string' && raw.cartItemKey
      ? raw.cartItemKey
      : buildCartItemKey(raw.productId, selectedSize)

  return {
    cartItemKey,
    productId: raw.productId,
    name: String(raw.name ?? ''),
    price: Number(raw.price) || 0,
    image_url: String(raw.image_url ?? ''),
    quantity: raw.quantity,
    selectedSize,
    maxStock: Math.max(Number(raw.maxStock) || 0, 0),
  }
}

function loadStoredItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeStoredItem(item))
      .filter((item): item is CartItem => item != null)
  } catch {
    return []
  }
}

function productToCartItem(
  product: Product,
  quantity: number,
  selectedSize: string | null
): CartItem {
  return {
    cartItemKey: buildCartItemKey(product.id, selectedSize),
    productId: product.id,
    name: product.name,
    price: getProductSalePrice(product),
    image_url: product.image_url,
    quantity,
    selectedSize,
    maxStock: Math.max(product.stock, 0),
  }
}

/** 全站購物車狀態（localStorage 暫存） */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadStoredItems())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(() => calcSubtotal(items), [items])
  const shippingFee = useMemo(() => calcShippingFee(subtotal), [subtotal])
  const grandTotal = useMemo(() => calcGrandTotal(items), [items])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const addItem = useCallback((product: Product, options: AddToCartOptions = {}) => {
    const qty = Math.max(1, Math.floor(options.quantity ?? 1))
    const needsSize = productRequiresBraceletSize(product.category)
    const selectedSize = options.selectedSize?.trim() || null

    if (needsSize && !selectedSize) return

    const cartItemKey = buildCartItemKey(product.id, selectedSize)

    setItems((prev) => {
      const existing = prev.find((item) => item.cartItemKey === cartItemKey)
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, product.stock)
        if (nextQty <= 0) return prev
        return prev.map((item) =>
          item.cartItemKey === cartItemKey
            ? {
                ...item,
                name: product.name,
                price: getProductSalePrice(product),
                image_url: product.image_url,
                maxStock: product.stock,
                quantity: nextQty,
              }
            : item
        )
      }
      if (product.stock <= 0) return prev
      return [
        ...prev,
        productToCartItem(product, Math.min(qty, product.stock), selectedSize),
      ]
    })
  }, [])

  const removeItem = useCallback((cartItemKey: string) => {
    setItems((prev) => prev.filter((item) => item.cartItemKey !== cartItemKey))
  }, [])

  const updateQuantity = useCallback((cartItemKey: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.cartItemKey !== cartItemKey)
      }
      return prev.map((item) => {
        if (item.cartItemKey !== cartItemKey) return item
        return {
          ...item,
          quantity: Math.min(Math.max(1, quantity), item.maxStock),
        }
      })
    })
  }, [])

  const updateItemSize = useCallback((cartItemKey: string, newSelectedSize: string) => {
    const size = newSelectedSize.trim()
    if (!size) return

    setItems((prev) => {
      const current = prev.find((item) => item.cartItemKey === cartItemKey)
      if (!current || current.selectedSize == null) return prev

      const newKey = buildCartItemKey(current.productId, size)
      if (newKey === cartItemKey) return prev

      const rest = prev.filter((item) => item.cartItemKey !== cartItemKey)
      const merged = rest.find((item) => item.cartItemKey === newKey)

      if (merged) {
        const combinedQty = merged.quantity + current.quantity
        return rest.map((item) =>
          item.cartItemKey === newKey
            ? {
                ...item,
                quantity: Math.min(combinedQty, item.maxStock),
              }
            : item
        )
      }

      return [
        ...rest,
        {
          ...current,
          cartItemKey: newKey,
          selectedSize: size,
        },
      ]
    })
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      shippingFee,
      grandTotal,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      updateItemSize,
      clearCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      shippingFee,
      grandTotal,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      updateItemSize,
      clearCart,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart 必須在 CartProvider 內使用')
  }
  return ctx
}
