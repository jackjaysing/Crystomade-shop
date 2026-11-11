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

  // paid + points + coupon = 商品小計 + 運費（優惠券／點數會對消）
  const merchandisePlusShipping =
    paidProductTotal + pointsDiscountNtd + couponDiscountNtd
  const productIfCharged = merchandisePlusShipping - standardFee

  // 免運後再扣券時，0 與標準運費常同時成立；優先採免運，避免核對明細灌入假運費。
  // （剛好未滿免運＋有運費＋有券的舊單可能誤判；新單改讀 checkout_shipping_fee）
  if (candidates.includes(0) && merchandisePlusShipping >= threshold) {
    return 0
  }

  if (
    candidates.includes(standardFee) &&
    productIfCharged >= 0 &&
    productIfCharged < threshold
  ) {
    return standardFee
  }

  return candidates.includes(0) ? 0 : standardFee
}

/** 優先讀結帳寫入的運費；舊單才反推 */
export function resolveCheckoutShippingFee(
  orders: Order[],
  paidProductTotal: number,
  pointsDiscountNtd: number,
  couponDiscountNtd: number
): number {
  for (const order of orders) {
    if (order.checkout_shipping_fee != null && order.checkout_shipping_fee >= 0) {
      return Number(order.checkout_shipping_fee)
    }
  }
  return detectShippingFee(
    paidProductTotal,
    pointsDiscountNtd,
    couponDiscountNtd,
    orders[0]?.cvs_brand
  )
}

export function formatNtdInteger(amount: number): string {
  return Math.round(amount).toLocaleString('zh-TW')
}

interface LinePricingEntry {
  key: string
  lineTotalAfterDiscount: number
  isFirstPaidLine: boolean
}

/**
 * 若有標價提示（list_unit_price 或商品現價），選重建結果最接近提示的吸收列。
 * 無提示時退回第一列（舊行為）。
 */
export function pickDiscountAbsorberKey(
  lineEntries: Array<{ key: string; lineTotalAfterDiscount: number }>,
  pointsDiscountNtd: number,
  couponDiscountNtd: number,
  shippingFeeNtd: number,
  listPriceHints?: Map<string, number>
): string | null {
  if (lineEntries.length === 0) return null
  if (couponDiscountNtd <= 0 && shippingFeeNtd <= 0) {
    return lineEntries[0]?.key ?? null
  }
  if (!listPriceHints || listPriceHints.size === 0) {
    return lineEntries[0]?.key ?? null
  }

  let bestKey = lineEntries[0].key
  let bestError = Number.POSITIVE_INFINITY

  for (const candidate of lineEntries) {
    const tagged: LinePricingEntry[] = lineEntries.map((entry) => ({
      ...entry,
      isFirstPaidLine: entry.key === candidate.key,
    }))
    const subtotalMap = reconstructLineSubtotals(
      tagged,
      pointsDiscountNtd,
      couponDiscountNtd,
      shippingFeeNtd
    )

    let error = 0
    let compared = 0
    for (const entry of lineEntries) {
      const hint = listPriceHints.get(entry.key)
      if (hint == null) continue
      compared += 1
      error += Math.abs((subtotalMap.get(entry.key) ?? 0) - hint)
    }
    if (compared === 0) continue

    if (error < bestError - 1e-6) {
      bestError = error
      bestKey = candidate.key
    }
  }

  return bestKey
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

/** 重建各列折抵前小計；有標價提示時用來對齊優惠券吸收列 */
export function reconstructPaidLineSubtotals(
  lineEntries: Array<{ key: string; lineTotalAfterDiscount: number }>,
  pointsDiscountNtd: number,
  couponDiscountNtd: number,
  shippingFeeNtd: number,
  listPriceHints?: Map<string, number>
): Map<string, number> {
  const absorberKey = pickDiscountAbsorberKey(
    lineEntries,
    pointsDiscountNtd,
    couponDiscountNtd,
    shippingFeeNtd,
    listPriceHints
  )
  const tagged: LinePricingEntry[] = lineEntries.map((entry) => ({
    ...entry,
    isFirstPaidLine: entry.key === absorberKey,
  }))
  return reconstructLineSubtotals(
    tagged,
    pointsDiscountNtd,
    couponDiscountNtd,
    shippingFeeNtd
  )
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
  const shippingFeeNtd = resolveCheckoutShippingFee(
    orders,
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
