import {
  COURIER_FREE_SHIPPING_THRESHOLD,
  COURIER_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from '../constants/shipping'
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

/** 購物車是否含須宅配商品 */
export function cartRequiresCourier(items: CartItem[]): boolean {
  return items.some((item) => item.requiresCourier)
}

/** 依運送方式取得免運門檻 */
export function getFreeShippingThresholdForCart(items: CartItem[]): number {
  return cartRequiresCourier(items)
    ? COURIER_FREE_SHIPPING_THRESHOLD
    : FREE_SHIPPING_THRESHOLD
}

/** 依運送方式取得未滿門檻運費 */
export function getShippingFeeAmountForCart(items: CartItem[]): number {
  return cartRequiresCourier(items) ? COURIER_SHIPPING_FEE : SHIPPING_FEE
}

/**
 * 運費（超商滿 600／宅配滿 1500 免運）
 * - 免運門檻僅計「付費商品」小計；兌換商品不可折抵／湊免運
 * - 購物車僅有兌換品時，仍依一般規則收取運費（未滿門檻 = 對應運費）
 * - 含任一須宅配商品時，整單走宅配運費規則
 */
export function calcShippingFeeForCart(items: CartItem[]): number {
  const productSubtotal = calcProductSubtotal(items)
  const threshold = getFreeShippingThresholdForCart(items)
  const fee = getShippingFeeAmountForCart(items)
  if (productSubtotal >= threshold) return 0
  if (productSubtotal > 0) return fee
  if (items.some(isPointRedemptionItem)) {
    return fee
  }
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
export function getFreeShippingProgressPercent(
  productSubtotal: number,
  threshold: number = FREE_SHIPPING_THRESHOLD
): number {
  if (productSubtotal <= 0) return 0
  return Math.min(100, (productSubtotal / threshold) * 100)
}

/** 距離免運還差多少（已達標則 0） */
export function getAmountToFreeShipping(
  subtotal: number,
  threshold: number = FREE_SHIPPING_THRESHOLD
): number {
  return Math.max(0, threshold - subtotal)
}

/** 是否已達免運門檻 */
export function hasFreeShipping(
  subtotal: number,
  threshold: number = FREE_SHIPPING_THRESHOLD
): boolean {
  return subtotal >= threshold
}
