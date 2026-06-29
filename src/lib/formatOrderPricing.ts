import type { OrderGroup } from './groupOrders'
import { formatNtdInteger } from './orderGroupPricing'

export type OrderPricingSummary = Pick<
  OrderGroup,
  'pointsDiscountNtd' | 'couponDiscountNtd' | 'shippingFeeNtd'
>

/** 訂單金額調整列（運費、折抵） */
export function formatOrderPricingAdjustments(group: OrderPricingSummary): string[] {
  const lines: string[] = []

  if (group.shippingFeeNtd > 0) {
    lines.push(`運費 NT$ ${formatNtdInteger(group.shippingFeeNtd)}`)
  }
  if (group.pointsDiscountNtd > 0) {
    lines.push(`點數折抵 -NT$ ${formatNtdInteger(group.pointsDiscountNtd)}`)
  }
  if (group.couponDiscountNtd > 0) {
    lines.push(`優惠券折抵 -NT$ ${formatNtdInteger(group.couponDiscountNtd)}`)
  }

  return lines
}

export function orderGroupHasPricingBreakdown(group: OrderPricingSummary): boolean {
  return (
    group.shippingFeeNtd > 0 ||
    group.pointsDiscountNtd > 0 ||
    group.couponDiscountNtd > 0
  )
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
