import type { OrderGroup, OrderLineItem } from './groupOrders'

export interface LineActualAllocation {
  orderId: string
  amount: number
}

/**
 * 將「買家實付總額」扣掉運費後，依各品項原商品實收比例攤到各訂單列。
 * 回傳每筆 order 列的商品實收（不含運費）。
 */
export function allocateActualPaidToOrderRows(
  group: Pick<OrderGroup, 'lineItems' | 'shippingFeeNtd' | 'orderIds'>,
  actualPaidNtd: number
): LineActualAllocation[] {
  const shipping = Math.max(0, group.shippingFeeNtd)
  const merchandise = Math.max(0, Math.round(actualPaidNtd) - shipping)
  const grossTotal = group.lineItems.reduce((sum, item) => sum + item.lineTotal, 0)

  if (group.lineItems.length === 0 || grossTotal <= 0) {
    return []
  }

  type LineShare = { item: OrderLineItem; weight: number; merchandise: number }
  const shares: LineShare[] = group.lineItems.map((item) => {
    const ratio = item.lineTotal / grossTotal
    const weight = Math.max(0, item.lineTotal - shipping * ratio)
    return { item, weight, merchandise: 0 }
  })

  const weightSum = shares.reduce((sum, s) => sum + s.weight, 0)
  let allocated = 0
  for (let i = 0; i < shares.length; i += 1) {
    if (i === shares.length - 1) {
      shares[i].merchandise = Math.max(0, merchandise - allocated)
    } else if (weightSum > 0) {
      const amount = Math.round((shares[i].weight / weightSum) * merchandise)
      shares[i].merchandise = amount
      allocated += amount
    }
  }

  const rows: LineActualAllocation[] = []
  for (const share of shares) {
    const ids = share.item.orderIds
    if (ids.length === 0) continue
    let rowAllocated = 0
    for (let i = 0; i < ids.length; i += 1) {
      const amount =
        i === ids.length - 1
          ? Math.max(0, share.merchandise - rowAllocated)
          : Math.round(share.merchandise / ids.length)
      if (i < ids.length - 1) rowAllocated += amount
      rows.push({ orderId: ids[i], amount })
    }
  }

  return rows
}

/** 計算損益用的各品項商品實收（優先品項實收 → 整單實收攤分 → 原訂單金額） */
export function resolveLineMerchandiseRevenues(
  group: Pick<OrderGroup, 'lineItems' | 'shippingFeeNtd' | 'actualPaidNtd' | 'orderIds'>
): number[] {
  const shipping = Math.max(0, group.shippingFeeNtd)
  const grossTotal = group.lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const hasAnyLineActual = group.lineItems.some(
    (item) => item.lineActualPaidNtd != null && item.lineActualPaidNtd >= 0
  )

  if (hasAnyLineActual) {
    return group.lineItems.map((item) => {
      if (item.lineActualPaidNtd != null && item.lineActualPaidNtd >= 0) {
        return Math.max(0, Math.round(item.lineActualPaidNtd))
      }
      const ratio = grossTotal > 0 ? item.lineTotal / grossTotal : 0
      return Math.max(0, Math.round(item.lineTotal - shipping * ratio))
    })
  }

  if (group.actualPaidNtd != null && group.actualPaidNtd >= 0) {
    const allocations = allocateActualPaidToOrderRows(group, group.actualPaidNtd)
    return group.lineItems.map((item) => {
      const sum = item.orderIds.reduce((acc, id) => {
        const found = allocations.find((row) => row.orderId === id)
        return acc + (found?.amount ?? 0)
      }, 0)
      return Math.max(0, sum)
    })
  }

  return group.lineItems.map((item) => {
    const ratio = grossTotal > 0 ? item.lineTotal / grossTotal : 0
    return Math.max(0, Math.round(item.lineTotal - shipping * ratio))
  })
}
