import {
  calcGrandTotal,
  calcGrandTotalBeforeDiscount,
  calcProductSubtotal,
  calcShippingFeeForCart,
} from './cartShipping'
import { isPointRedemptionItem } from './cartItemKinds'
import { isProductSoldOut } from './productStock'
import type { CartItem, Product } from './types'

export interface ResolvedCartItem {
  item: CartItem
  currentStock: number
  checkoutQuantity: number
  isFullySnatched: boolean
  snatchedQuantity: number
}

export function buildProductMap(products: Product[]): Map<string, Product> {
  return new Map(products.map((product) => [product.id, product]))
}

/** 比對購物車品項與即時庫存 */
export function resolveCartItems(
  items: CartItem[],
  productsById: Map<string, Product>
): ResolvedCartItem[] {
  return items.map((item) => {
    if (isPointRedemptionItem(item)) {
      const currentStock = item.maxStock
      const checkoutQuantity = Math.min(item.quantity, currentStock)
      return {
        item,
        currentStock,
        checkoutQuantity,
        isFullySnatched: checkoutQuantity === 0,
        snatchedQuantity: item.quantity - checkoutQuantity,
      }
    }

    const product = productsById.get(item.productId)
    const currentStock =
      product && !isProductSoldOut(product) ? product.stock : 0
    const checkoutQuantity = Math.min(item.quantity, currentStock)
    const snatchedQuantity = item.quantity - checkoutQuantity

    return {
      item,
      currentStock,
      checkoutQuantity,
      isFullySnatched: checkoutQuantity === 0,
      snatchedQuantity,
    }
  })
}

/** 可結帳品項（排除已售罄、數量依庫存上限） */
export function toCheckoutItems(resolved: ResolvedCartItem[]): CartItem[] {
  return resolved
    .filter((entry) => entry.checkoutQuantity > 0)
    .map((entry) => ({
      ...entry.item,
      quantity: entry.checkoutQuantity,
      maxStock: entry.currentStock,
    }))
}

export function calcCheckoutTotals(
  items: CartItem[],
  pointsDiscountNtd = 0
) {
  const subtotal = calcProductSubtotal(items)
  const shippingFee = calcShippingFeeForCart(items)
  const grandTotalBeforeDiscount = calcGrandTotalBeforeDiscount(items)
  const grandTotal = calcGrandTotal(items, pointsDiscountNtd)
  return { subtotal, shippingFee, grandTotal, grandTotalBeforeDiscount }
}
