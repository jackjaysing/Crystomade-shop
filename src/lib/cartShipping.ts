import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../constants/shipping'
import type { CartItem } from './types'

/** 購物車商品小計 */
export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/** 運費（滿 600 免運） */
export function calcShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal > 0 ? SHIPPING_FEE : 0
}

/** 應付總額 */
export function calcGrandTotal(items: CartItem[]): number {
  const subtotal = calcSubtotal(items)
  return subtotal + calcShippingFee(subtotal)
}

/** 免運進度 0–100 */
export function getFreeShippingProgressPercent(subtotal: number): number {
  if (subtotal <= 0) return 0
  return Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)
}

/** 距離免運還差多少（已達標則 0） */
export function getAmountToFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
}

/** 是否已達免運門檻 */
export function hasFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD
}
