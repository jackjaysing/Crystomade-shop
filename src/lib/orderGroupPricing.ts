import {
  COURIER_FREE_SHIPPING_THRESHOLD,
  COURIER_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from '../constants/shipping'
import type { CvsBrand, Order } from './types'

export function isPaidProductOrder(order: Order): boolean {
  if (order.is_point_redemption) return false
  if (!order.product_id && order.member_coupon_id) return false
  return Boolean(order.product_id || order.product_name)
}

export function lineItemKeyFromOrder(order: Order): string {
  const sizeKey = order.selected_size?.trim() ?? ''
  const variantKey = order.variant_id?.trim() || order.variant_name?.trim() || ''
  const configKey = order.bracelet_config?.beads?.length
    ? order.bracelet_config.beads.map((b) => `${b.bead_id}:${b.size}`).join(',')
    : ''
  return `${order.product_id || order.product_name || order.id}::${variantKey}::${sizeKey}::${configKey}`
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

export function resolveCheckoutActualPaidNtd(orders: Order[]): number | null {
  for (const order of orders) {
    const value = order.checkout_actual_paid_ntd
    if (value != null && value >= 0) return Number(value)
  }
  return null
}

/** 贈點／經驗計算用金額：有實際收款則用實際收款，否則為付費商品列加總 */
export function resolveOrderGroupPayableNtd(orders: Order[]): number {
  const actual = resolveCheckoutActualPaidNtd(orders)
  if (actual != null) return Math.max(0, Math.round(actual))
  const paidOrders = orders.filter(isPaidProductOrder)
  return Math.round(
    paidOrders.reduce((sum, order) => sum + order.total_amount, 0)
  )
}

export function detectShippingFee(
  paidProductTotal: number,
  pointsDiscountNtd: number,
  couponDiscountNtd: number,
  cvsBrand?: CvsBrand | null
): number {
  const isCourier = cvsBrand === '宅配'
  const standardFee = isCourier ? COURIER_SHIPPING_FEE : SHIPPING_FEE
  const threshold = isCourier
    ? COURIER_FREE_SHIPPING_THRESHOLD
    : FREE_SHIPPING_THRESHOLD
  const feeOptions = isCourier
    ? [0, COURIER_SHIPPING_FEE]
    : [0, SHIPPING_FEE, COURIER_SHIPPING_FEE]
  const candidates: number[] = []

  for (const shippingFee of feeOptions) {
    const subtotalBeforePoints =
      paidProductTotal - shippingFee + pointsDiscountNtd + couponDiscountNtd
    if (
      subtotalBeforePoints >= 0 &&
      Math.abs(subtotalBeforePoints - Math.round(subtotalBeforePoints)) < 0.01
    ) {
      candidates.push(shippingFee)
    }
  }

  if (candidates.length === 0) return 0
  if (candidates.length === 1) return candidates[0]

  const impliedProductSubtotal =
    paidProductTotal - standardFee + pointsDiscountNtd + couponDiscountNtd
  if (
    candidates.includes(standardFee) &&
    impliedProductSubtotal < threshold
  ) {
    return standardFee
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
  couponDiscountNtd: number,
  shippingFeeNtd: number
): Map<string, number> {
  const result = new Map<string, number>()
  if (lineEntries.length === 0) return result

  let sumAfterPoints = 0
  const afterPoints = lineEntries.map((entry) => {
    let lineAfterPoints = entry.lineTotalAfterDiscount
    if (entry.isFirstPaidLine) {
      if (couponDiscountNtd > 0) {
        lineAfterPoints += couponDiscountNtd
      }
      if (shippingFeeNtd > 0) {
        lineAfterPoints -= shippingFeeNtd
      }
    }
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
    couponDiscountNtd,
    orders[0]?.cvs_brand
  )

  return {
    pointsDiscountNtd,
    couponDiscountNtd,
    shippingFeeNtd,
  }
}
