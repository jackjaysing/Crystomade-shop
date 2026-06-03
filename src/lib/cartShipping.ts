import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../constants/shipping'
import { isPaidCartItem, isPointRedemptionItem } from './cartItemKinds'
import type { CartItem } from './types'

/** 付費商品小計（不含點數兌換品、不含點數折抵） */
export function calcProductSubtotal(items: CartItem[]): number {
  return items
    .filter(isPaidCartItem)
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/** @deprecated 使用 calcProductSubtotal */
export function calcSubtotal(items: CartItem[]): number {
  return calcProductSubtotal(items)
}

/**
 * 運費（滿 600 免運）
 * - 免運門檻僅計「付費商品」小計；兌換商品不可折抵／湊免運
 * - 購物車僅有兌換品時，仍依一般規則收取運費（未滿門檻 = SHIPPING_FEE）
 */
export function calcShippingFeeForCart(items: CartItem[]): number {
  const productSubtotal = calcProductSubtotal(items)
  if (productSubtotal >= FREE_SHIPPING_THRESHOLD) return 0
  if (productSubtotal > 0) return SHIPPING_FEE
  if (items.some(isPointRedemptionItem)) return SHIPPING_FEE
  return 0
}

/** @deprecated 請改用 calcShippingFeeForCart */
export function calcShippingFee(productSubtotal: number): number {
  return productSubtotal >= FREE_SHIPPING_THRESHOLD
    ? 0
    : productSubtotal > 0
      ? SHIPPING_FEE
      : 0
}

/** 應付總額（含運費，未扣點數折抵） */
export function calcGrandTotalBeforeDiscount(items: CartItem[]): number {
  const subtotal = calcProductSubtotal(items)
  return subtotal + calcShippingFeeForCart(items)
}

/** 應付總額（套用點數折抵 NT$） */
export function calcGrandTotal(
  items: CartItem[],
  pointsDiscountNtd = 0
): number {
  const subtotal = calcProductSubtotal(items)
  const discount = Math.min(Math.max(0, pointsDiscountNtd), subtotal)
  return subtotal - discount + calcShippingFeeForCart(items)
}

/** 免運進度 0–100 */
export function getFreeShippingProgressPercent(productSubtotal: number): number {
  if (productSubtotal <= 0) return 0
  return Math.min(100, (productSubtotal / FREE_SHIPPING_THRESHOLD) * 100)
}

/** 距離免運還差多少（已達標則 0） */
export function getAmountToFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
}

/** 是否已達免運門檻 */
export function hasFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD
}
