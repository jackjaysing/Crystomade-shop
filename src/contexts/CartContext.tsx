import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { calcGrandTotal, calcShippingFee, calcSubtotal } from '../lib/cartShipping'
import type { CartItem, Product } from '../lib/types'

const STORAGE_KEY = 'crystomade-cart'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  shippingFee: number
  grandTotal: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function loadStoredItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.productId === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
    )
  } catch {
    return []
  }
}

function productToCartItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    image_url: product.image_url,
    quantity,
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

  const addItem = useCallback((product: Product, quantity = 1) => {
    const qty = Math.max(1, Math.floor(quantity))
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, product.stock)
        if (nextQty <= 0) return prev
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                maxStock: product.stock,
                quantity: nextQty,
              }
            : item
        )
      }
      if (product.stock <= 0) return prev
      return [...prev, productToCartItem(product, Math.min(qty, product.stock))]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== productId)
      }
      return prev.map((item) => {
        if (item.productId !== productId) return item
        return {
          ...item,
          quantity: Math.min(Math.max(1, quantity), item.maxStock),
        }
      })
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
