import type { OrderGroup } from './groupOrders'
import { formatNtdInteger } from './orderGroupPricing'

export type OrderPricingSummary = Pick<
  OrderGroup,
  'pointsDiscountNtd' | 'couponDiscountNtd' | 'shippingFeeNtd' | 'cvs_brand'
>

/** 訂單金額調整列（運費、折抵）；免運／自取也明確列出，避免核對明細只有商品價看起來缺一截 */
export function formatOrderPricingAdjustments(group: OrderPricingSummary): string[] {
  const lines: string[] = []

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
  const amount =
    item.lineSubtotal != null && item.lineSubtotal > 0
      ? item.lineSubtotal
      : item.lineTotal
  return formatNtdInteger(amount)
}
