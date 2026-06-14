import { SHIPPING_FEE } from '../constants/shipping'
import type { Order } from './types'

export function isPaidProductOrder(order: Order): boolean {
  if (order.is_point_redemption) return false
  if (!order.product_id && order.member_coupon_id) return false
  return Boolean(order.product_id || order.product_name)
}

export function lineItemKeyFromOrder(order: Order): string {
  const sizeKey = order.selected_size?.trim() ?? ''
  return `${order.product_id || order.product_name || order.id}::${sizeKey}`
}

export function resolveCheckoutPointsDiscount(orders: Order[]): number {
  for (const order of orders) {
    const value = order.checkout_discount_ntd
    if (value != null && value > 0) return Number(value)
  }
  return 0
}

export function resolveCheckoutCouponDiscount(orders: Order[]): number {
  for (const order of orders) {
    const value = order.checkout_coupon_discount
    if (value != null && value > 0) return Number(value)
  }
  return 0
}

export function detectShippingFee(
  paidProductTotal: number,
  pointsDiscountNtd: number,
  couponDiscountNtd: number
): number {
  for (const shippingFee of [0, SHIPPING_FEE]) {
    const subtotalBeforePoints =
      paidProductTotal - shippingFee + pointsDiscountNtd + couponDiscountNtd
    if (
      subtotalBeforePoints >= 0 &&
      Math.abs(subtotalBeforePoints - Math.round(subtotalBeforePoints)) < 0.01
    ) {
      return shippingFee
    }
  }
  return 0
}

export function formatNtdInteger(amount: number): string {
  return Math.round(amount).toLocaleString('zh-TW')
}

interface LinePricingEntry {
  key: string
  lineTotalAfterDiscount: number
  isFirstPaidLine: boolean
}

export function reconstructLineSubtotals(
  lineEntries: LinePricingEntry[],
  pointsDiscountNtd: number,
  couponDiscountNtd: number
): Map<string, number> {
  const result = new Map<string, number>()
  if (lineEntries.length === 0) return result

  let sumAfterPoints = 0
  const afterPoints = lineEntries.map((entry) => {
    const lineAfterPoints =
      entry.lineTotalAfterDiscount +
      (entry.isFirstPaidLine ? couponDiscountNtd : 0)
    sumAfterPoints += lineAfterPoints
    return { key: entry.key, lineAfterPoints }
  })

  const sumBeforePoints = sumAfterPoints + pointsDiscountNtd
  if (sumAfterPoints <= 0 || sumBeforePoints <= 0) {
    for (const entry of lineEntries) {
      result.set(entry.key, entry.lineTotalAfterDiscount)
    }
    return result
  }

  let allocated = 0
  for (let index = 0; index < afterPoints.length; index += 1) {
    const { key, lineAfterPoints } = afterPoints[index]
    if (index === afterPoints.length - 1) {
      result.set(key, Math.max(0, Math.round(sumBeforePoints - allocated)))
      continue
    }

    const lineSubtotal = Math.round(
      (lineAfterPoints / sumAfterPoints) * sumBeforePoints
    )
    result.set(key, lineSubtotal)
    allocated += lineSubtotal
  }

  return result
}

export function resolveOrderGroupPricing(orders: Order[]): {
  pointsDiscountNtd: number
  couponDiscountNtd: number
  shippingFeeNtd: number
} {
  const paidOrders = orders.filter(isPaidProductOrder)
  const paidProductTotal = paidOrders.reduce(
    (sum, order) => sum + order.total_amount,
    0
  )
  const pointsDiscountNtd = resolveCheckoutPointsDiscount(orders)
  const couponDiscountNtd = resolveCheckoutCouponDiscount(orders)
  const shippingFeeNtd = detectShippingFee(
    paidProductTotal,
    pointsDiscountNtd,
    couponDiscountNtd
  )

  return {
    pointsDiscountNtd,
    couponDiscountNtd,
    shippingFeeNtd,
  }
}
