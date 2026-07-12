import { formatOrderLineItemDetail } from '../constants/braceletSizes'
import { formatBraceletConfigSummary } from './braceletConfig'
import {
  formatOrderLineDisplayAmount,
  formatOrderPricingAdjustments,
} from './formatOrderPricing'
import type { OrderGroup, OrderLineItem } from './groupOrders'

/** 編號欄位（無 emoji，LINE 複製後較整齊） */
export function formatNumberedField(
  index: number,
  label: string,
  value: string
): string {
  return `${index}. ${label}：${value}`
}

/** 明細標題 + 縮排子項 */
export function formatNumberedItemSection(
  index: number,
  sectionLabel: string,
  lineItems: OrderLineItem[],
  group?: Pick<OrderGroup, 'pointsDiscountNtd' | 'couponDiscountNtd' | 'shippingFeeNtd'>
): string[] {
  const header = `${index}. ${sectionLabel}`
  const detailLines = lineItems.flatMap((item, i) => {
    const line = formatOrderLineItemDetail({
      productName: item.productName,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      braceletConfigSummary: formatBraceletConfigSummary(item.braceletConfig),
    })
    const amount = formatOrderLineDisplayAmount(item)
    const rows = [`   ${i + 1}) ${line} NT$ ${amount}`]
    if (item.braceletConfig?.beads.length) {
      const beadNames = item.braceletConfig.beads
        .map((b, bi) => `${bi + 1}.${b.name}`)
        .join(' → ')
      rows.push(`      珠序：${beadNames}`)
    }
    return rows
  })

  const adjustmentLines = group
    ? formatOrderPricingAdjustments(group).map((line) => `      ${line}`)
    : []

  const lines =
    detailLines.length > 0 ? [header, ...detailLines, ...adjustmentLines] : [`${header}：（無）`]
  return lines
}
