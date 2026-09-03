import { calcStudioShareAmount } from '../constants/studioLocations'
import { resolveLineMerchandiseRevenues } from './actualPaidAllocation'
import type { OrderGroup } from './groupOrders'
import type { StudioLocation } from './types'

export interface OrderLineProfit {
  productId: string
  productName: string
  studio: StudioLocation | null
  /** 扣除運費分攤後的商品實收 */
  revenue: number
  cost: number
  netProfit: number
}

export interface OrderGroupProfit {
  /** 商品實收（不含運費） */
  revenue: number
  cost: number
  netProfit: number
  /** 此單全部分潤合計 */
  shareTotal: number
  /** 淨利潤扣除全部分潤後 */
  netProfitAfterShare: number
  /** 是否有任一品項填了成本 */
  hasCost: boolean
  /** 毛利率（%） */
  marginPercent: number
  /** 是否依實際收款／品項實收計算 */
  usedActualPaid: boolean
  lines: OrderLineProfit[]
}

/**
 * 單筆結帳的淨利潤：商品實收減去商品成本。
 * 優先使用品項實收／整單實際收款攤分；否則用訂單列金額並剔除運費。
 */
export function computeOrderGroupProfit(group: OrderGroup): OrderGroupProfit {
  const revenues = resolveLineMerchandiseRevenues(group)
  const usedActualPaid =
    (group.actualPaidNtd != null && group.actualPaidNtd >= 0) ||
    group.lineItems.some(
      (item) => item.lineActualPaidNtd != null && item.lineActualPaidNtd >= 0
    )

  const lines: OrderLineProfit[] = group.lineItems.map((item, index) => {
    const revenue = revenues[index] ?? 0
    const cost = item.unitCost * item.quantity
    return {
      productId: item.productId,
      productName: item.productName,
      studio: item.studioLocation,
      revenue,
      cost,
      netProfit: revenue - cost,
    }
  })

  const revenue = lines.reduce((sum, line) => sum + line.revenue, 0)
  const cost = lines.reduce((sum, line) => sum + line.cost, 0)
  const netProfit = revenue - cost
  const shareTotal = lines.reduce((sum, line) => {
    if (!line.studio) return sum
    return sum + calcStudioShareAmount(line.netProfit)
  }, 0)

  return {
    revenue,
    cost,
    netProfit,
    shareTotal,
    netProfitAfterShare: netProfit - shareTotal,
    hasCost: cost > 0,
    marginPercent: revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0,
    usedActualPaid,
    lines,
  }
}
