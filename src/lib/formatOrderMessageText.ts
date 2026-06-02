import type { OrderLineItem } from './groupOrders'

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
  lineItems: OrderLineItem[]
): string[] {
  const header = `${index}. ${sectionLabel}`
  const detailLines = lineItems.map(
    (item, i) => `   ${i + 1}) ${item.productName} x ${item.quantity}`
  )
  return detailLines.length > 0 ? [header, ...detailLines] : [`${header}：（無）`]
}
