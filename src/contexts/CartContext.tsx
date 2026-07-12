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
import {
  buildPointCartItemKey,
  buildRaffleGiftCartItemKey,
} from '../lib/cartItemKinds'
import {
  calcGrandTotalBeforeDiscount,
  calcProductSubtotal,
  calcShippingFeeForCart,
} from '../lib/cartShipping'
import {
  braceletConfigFingerprint,
  normalizeBraceletConfig,
  type BraceletConfig,
} from '../lib/braceletConfig'
import { getProductSalePrice } from '../lib/productPricing'
import type { CartItem, PointProduct, Product } from '../lib/types'

const STORAGE_KEY = 'crystomade-cart'

export interface AddToCartOptions {
  quantity?: number
  selectedSize?: string | null
  braceletConfig?: BraceletConfig | null
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
  addPointRedemption: (pointProduct: PointProduct) => void
  addRaffleGift: (payload: {
    memberCouponId: string
    title: string
    giftDescription: string
    imageUrl: string
  }) => void
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
  const braceletConfig = normalizeBraceletConfig(raw.braceletConfig ?? null)
  const cartItemKey =
    typeof raw.cartItemKey === 'string' && raw.cartItemKey
      ? raw.cartItemKey
      : buildCartItemKey(
          raw.productId,
          selectedSize,
          braceletConfig ? braceletConfigFingerprint(braceletConfig) : null
        )

  const kind =
    raw.kind === 'point_redemption'
      ? 'point_redemption'
      : raw.kind === 'raffle_gift'
        ? 'raffle_gift'
        : 'product'

  return {
    cartItemKey,
    kind,
    productId: raw.productId,
    pointProductId: raw.pointProductId != null ? String(raw.pointProductId) : undefined,
    requiredPoints:
      raw.requiredPoints != null ? Number(raw.requiredPoints) || 0 : undefined,
    name: String(raw.name ?? ''),
    price: Number(raw.price) || 0,
    image_url: String(raw.image_url ?? ''),
    quantity: raw.quantity,
    selectedSize,
    braceletConfig,
    maxStock: Math.max(Number(raw.maxStock) || 0, 0),
    memberCouponId:
      raw.memberCouponId != null ? String(raw.memberCouponId) : undefined,
    giftDescription:
      raw.giftDescription != null ? String(raw.giftDescription) : undefined,
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
  selectedSize: string | null,
  braceletConfig: BraceletConfig | null = null
): CartItem {
  const fingerprint = braceletConfig
    ? braceletConfigFingerprint(braceletConfig)
    : null
  return {
    cartItemKey: buildCartItemKey(product.id, selectedSize, fingerprint),
    productId: product.id,
    name: product.name,
    price: getProductSalePrice(product),
    image_url: product.image_url,
    quantity,
    selectedSize,
    braceletConfig,
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

  const subtotal = useMemo(() => calcProductSubtotal(items), [items])
  const shippingFee = useMemo(() => calcShippingFeeForCart(items), [items])
  const grandTotal = useMemo(() => calcGrandTotalBeforeDiscount(items), [items])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const addItem = useCallback((product: Product, options: AddToCartOptions = {}) => {
    const qty = Math.max(1, Math.floor(options.quantity ?? 1))
    const needsSize = productRequiresBraceletSize(product.category)
    const braceletConfig = options.braceletConfig
      ? normalizeBraceletConfig(options.braceletConfig)
      : null
    const selectedSize =
      options.selectedSize?.trim() ||
      braceletConfig?.wrist_size?.trim() ||
      null

    if (needsSize && !selectedSize) return

    // 配置手串：每筆配置固定 1 件，避免同配置加量混淆串製單
    const addQty = braceletConfig ? 1 : qty
    const cartItemKey = buildCartItemKey(
      product.id,
      selectedSize,
      braceletConfig ? braceletConfigFingerprint(braceletConfig) : null
    )

    setItems((prev) => {
      const existing = prev.find((item) => item.cartItemKey === cartItemKey)
      if (existing) {
        if (braceletConfig) return prev
        const nextQty = Math.min(existing.quantity + addQty, product.stock)
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
        productToCartItem(
          product,
          Math.min(addQty, product.stock),
          selectedSize,
          braceletConfig
        ),
      ]
    })
  }, [])

  const addPointRedemption = useCallback((pointProduct: PointProduct) => {
    const cartItemKey = buildPointCartItemKey(pointProduct.id)
    setItems((prev) => {
      const existing = prev.find((item) => item.cartItemKey === cartItemKey)
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, pointProduct.stock)
        if (nextQty <= 0) return prev
        return prev.map((item) =>
          item.cartItemKey === cartItemKey
            ? {
                ...item,
                name: pointProduct.name,
                image_url: pointProduct.image_url,
                requiredPoints: pointProduct.required_points,
                maxStock: pointProduct.stock,
                quantity: nextQty,
              }
            : item
        )
      }
      if (pointProduct.stock <= 0) return prev
      return [
        ...prev,
        {
          cartItemKey,
          kind: 'point_redemption' as const,
          productId: pointProduct.id,
          pointProductId: pointProduct.id,
          requiredPoints: pointProduct.required_points,
          name: `${pointProduct.name}（點數兌換）`,
          price: 0,
          image_url: pointProduct.image_url,
          quantity: 1,
          selectedSize: null,
          maxStock: pointProduct.stock,
        },
      ]
    })
  }, [])

  const addRaffleGift = useCallback(
    (payload: {
      memberCouponId: string
      title: string
      giftDescription: string
      imageUrl: string
    }) => {
      const cartItemKey = buildRaffleGiftCartItemKey(payload.memberCouponId)
      setItems((prev) => {
        if (prev.some((item) => item.cartItemKey === cartItemKey)) return prev
        return [
          ...prev,
          {
            cartItemKey,
            kind: 'raffle_gift' as const,
            productId: payload.memberCouponId,
            memberCouponId: payload.memberCouponId,
            name: `${payload.title}（抽獎禮物）`,
            giftDescription: payload.giftDescription,
            price: 0,
            image_url: payload.imageUrl,
            quantity: 1,
            selectedSize: null,
            maxStock: 1,
          },
        ]
      })
    },
    []
  )

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
        if (item.braceletConfig) {
          return { ...item, quantity: 1 }
        }
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

      // 已配置手串：改手圍時一併更新配置內 wrist_size，且不與其他列合併
      if (current.braceletConfig) {
        const nextConfig: BraceletConfig = {
          ...current.braceletConfig,
          wrist_size: size,
        }
        const newKey = buildCartItemKey(
          current.productId,
          size,
          braceletConfigFingerprint(nextConfig)
        )
        if (newKey === cartItemKey) {
          return prev.map((item) =>
            item.cartItemKey === cartItemKey
              ? { ...item, selectedSize: size, braceletConfig: nextConfig }
              : item
          )
        }
        const rest = prev.filter((item) => item.cartItemKey !== cartItemKey)
        if (rest.some((item) => item.cartItemKey === newKey)) return prev
        return [
          ...rest,
          {
            ...current,
            cartItemKey: newKey,
            selectedSize: size,
            braceletConfig: nextConfig,
          },
        ]
      }

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
      addPointRedemption,
      addRaffleGift,
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
      addPointRedemption,
      addRaffleGift,
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
