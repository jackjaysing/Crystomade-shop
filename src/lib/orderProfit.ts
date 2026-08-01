import { calcStudioShareAmount } from '../constants/studioLocations'
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
  lines: OrderLineProfit[]
}

/**
 * 單筆結帳的淨利潤：商品實收（已扣點數／優惠券折抵，並剔除運費）減去商品成本。
 * 運費併在第一筆付費商品列內，這裡依各列金額比例扣回。
 */
export function computeOrderGroupProfit(group: OrderGroup): OrderGroupProfit {
  const grossTotal = group.lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const shippingFee = group.shippingFeeNtd

  const lines: OrderLineProfit[] = group.lineItems.map((item) => {
    const ratio = grossTotal > 0 ? item.lineTotal / grossTotal : 0
    const revenue = item.lineTotal - shippingFee * ratio
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
    lines,
  }
}
