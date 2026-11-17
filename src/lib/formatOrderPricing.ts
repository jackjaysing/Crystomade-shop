import type { OrderGroup, OrderLineItem } from './groupOrders'
import { formatNtdInteger } from './orderGroupPricing'

export type OrderPricingSummary = Pick<
  OrderGroup,
  | 'pointsDiscountNtd'
  | 'couponDiscountNtd'
  | 'shippingFeeNtd'
  | 'cvs_brand'
  | 'lineItems'
>

export function lineItemDisplayAmount(item: {
  lineSubtotal?: number
  lineTotal: number
}): number {
  return item.lineSubtotal != null && item.lineSubtotal > 0
    ? item.lineSubtotal
    : item.lineTotal
}

export function sumLineItemDisplayAmounts(lineItems: OrderLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + lineItemDisplayAmount(item), 0)
}

/** 訂單金額調整列（運費、折抵）；有折抵時先列商品小計，避免核對看起來跳號 */
export function formatOrderPricingAdjustments(group: OrderPricingSummary): string[] {
  const lines: string[] = []
  const hasDiscounts =
    group.pointsDiscountNtd > 0 || group.couponDiscountNtd > 0
  const hasPaidShipping = group.shippingFeeNtd > 0

  if (hasDiscounts || hasPaidShipping) {
    const merchandiseSubtotal = sumLineItemDisplayAmounts(group.lineItems)
    if (merchandiseSubtotal > 0) {
      lines.push(`商品小計 NT$ ${formatNtdInteger(merchandiseSubtotal)}`)
    }
  }

  if (group.shippingFeeNtd > 0) {
    lines.push(`運費 NT$ ${formatNtdInteger(group.shippingFeeNtd)}`)
  } else {
    lines.push(group.cvs_brand === '自取' ? '運費：自取免運' : '運費：免運')
  }
  if (group.pointsDiscountNtd > 0) {
    lines.push(`點數折抵 -NT$ ${formatNtdInteger(group.pointsDiscountNtd)}`)
  }
  if (group.couponDiscountNtd > 0) {
    lines.push(`優惠券折抵 -NT$ ${formatNtdInteger(group.couponDiscountNtd)}`)
  }

  return lines
}

export function orderGroupHasPricingBreakdown(
  _group: OrderPricingSummary
): boolean {
  // 至少會有運費列（含免運／自取免運），後台展開時一律顯示合計
  return true
}

export function formatOrderLineDisplayAmount(item: {
  lineSubtotal?: number
  lineTotal: number
}): string {
  return formatNtdInteger(lineItemDisplayAmount(item))
}
