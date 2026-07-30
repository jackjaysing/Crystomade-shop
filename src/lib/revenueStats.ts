import { PRODUCT_CATEGORIES } from '../constants/categories'
import {
  STUDIO_LOCATIONS,
  calcStudioShareAmount,
} from '../constants/studioLocations'
import { groupOrders, type OrderGroup } from './groupOrders'
import { formatOrderGroupMonthLabel, getOrderGroupMonthKey } from './orderGroupFilters'
import { computeOrderGroupProfit } from './orderProfit'
import type { Order, ProductCategory, StudioLocation } from './types'

export const REVENUE_CATEGORY_COLORS: Record<ProductCategory, string> = {
  手串: '#e8c872',
  配飾: '#f9a8d4',
  擺件: '#5eead4',
  礦石: '#c4b5fd',
}

export interface RevenueCategorySlice {
  category: ProductCategory
  label: string
  revenue: number
  percent: number
}

export interface RevenueMonthPoint {
  monthKey: string
  label: string
  revenue: number
  orderCount: number
}

/** 工作室分潤：單一月份 */
export interface StudioShareMonthPoint {
  monthKey: string
  label: string
  netProfit: number
  shareAmount: number
}

/** 工作室分潤：單一工作室彙總 */
export interface StudioProfitShare {
  studio: StudioLocation
  label: string
  monthNetProfit: number
  monthShareAmount: number
  totalNetProfit: number
  totalShareAmount: number
  monthlySeries: StudioShareMonthPoint[]
}

export interface RevenueStats {
  totalRevenue: number
  monthRevenue: number
  todayRevenue: number
  pendingRevenue: number
  monthPendingRevenue: number
  paidOrderCount: number
  pendingOrderCount: number
  monthPaidCount: number
  monthPendingCount: number
  monthlySeries: RevenueMonthPoint[]
  categorySlices: RevenueCategorySlice[]
  /** 已結帳商品成本合計 */
  totalCost: number
  /** 已結帳淨利潤合計（商品實收扣成本，不含運費） */
  totalNetProfit: number
  monthCost: number
  monthNetProfit: number
  /** 是否已有商品填寫成本 */
  hasCostData: boolean
  /** 各實體工作室分潤 */
  studioShares: StudioProfitShare[]
  /** 本月各工作室分潤合計 */
  monthStudioShareTotal: number
  /** 累計各工作室分潤合計 */
  totalStudioShareTotal: number
}

function resolveOrderCategory(order: Order): ProductCategory | null {
  const category = order.products?.category
  if (
    category === '手串' ||
    category === '配飾' ||
    category === '擺件' ||
    category === '礦石'
  ) {
    return category
  }
  return null
}

function buildCategorySlices(orders: Order[]): RevenueCategorySlice[] {
  const totals = new Map<ProductCategory, number>()
  for (const category of PRODUCT_CATEGORIES) {
    totals.set(category.id, 0)
  }

  let sum = 0
  for (const order of orders) {
    if (!order.is_paid || order.status === 'cancelled') continue
    const category = resolveOrderCategory(order)
    if (!category) continue
    const amount = Number(order.total_amount) || 0
    totals.set(category, (totals.get(category) ?? 0) + amount)
    sum += amount
  }

  return PRODUCT_CATEGORIES.map((option) => {
    const revenue = totals.get(option.id) ?? 0
    return {
      category: option.id,
      label: option.label,
      revenue,
      percent: sum > 0 ? Math.round((revenue / sum) * 1000) / 10 : 0,
    }
  }).filter((slice) => slice.revenue > 0)
}

const MONTHLY_CHART_MONTHS = 6

/** 已結帳且未取消的訂單才計入收入 */
export function countsAsPaidRevenue(group: OrderGroup): boolean {
  return group.status !== 'cancelled' && group.paymentStatus === 'paid'
}

/** 未結帳且未取消的訂單計入待收款 */
export function countsAsPendingRevenue(group: OrderGroup): boolean {
  return group.status !== 'cancelled' && group.paymentStatus !== 'paid'
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildRecentMonthKeys(endDate: Date, count: number): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    keys.push(`${year}-${month}`)
  }
  return keys
}

/** 依後台訂單（已排除軟刪除）計算收入統計 */
export function computeRevenueStats(orders: Order[]): RevenueStats {
  const groups = groupOrders(orders)
  const now = new Date()
  const currentMonthKey = getOrderGroupMonthKey(now.toISOString())

  let totalRevenue = 0
  let monthRevenue = 0
  let todayRevenue = 0
  let pendingRevenue = 0
  let paidOrderCount = 0
  let pendingOrderCount = 0
  let monthPendingRevenue = 0
  let monthPaidCount = 0
  let monthPendingCount = 0
  let totalCost = 0
  let totalNetProfit = 0
  let monthCost = 0
  let monthNetProfit = 0

  const monthRevenueMap = new Map<string, { revenue: number; orderCount: number }>()
  const studioMonthProfit = new Map<StudioLocation, Map<string, number>>()

  for (const group of groups) {
    const createdAt = new Date(group.created_at)
    const monthKey = getOrderGroupMonthKey(group.created_at)
    const amount = Number(group.totalAmount) || 0

    if (countsAsPaidRevenue(group)) {
      totalRevenue += amount
      paidOrderCount += 1

      if (monthKey === currentMonthKey) {
        monthRevenue += amount
        monthPaidCount += 1
      }

      if (isSameLocalDay(createdAt, now)) {
        todayRevenue += amount
      }

      const bucket = monthRevenueMap.get(monthKey) ?? { revenue: 0, orderCount: 0 }
      bucket.revenue += amount
      bucket.orderCount += 1
      monthRevenueMap.set(monthKey, bucket)

      const profit = computeOrderGroupProfit(group)
      totalCost += profit.cost
      totalNetProfit += profit.netProfit
      if (monthKey === currentMonthKey) {
        monthCost += profit.cost
        monthNetProfit += profit.netProfit
      }

      for (const line of profit.lines) {
        if (!line.studio) continue
        const byMonth = studioMonthProfit.get(line.studio) ?? new Map<string, number>()
        byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + line.netProfit)
        studioMonthProfit.set(line.studio, byMonth)
      }
    }

    if (countsAsPendingRevenue(group)) {
      pendingRevenue += amount
      pendingOrderCount += 1

      if (monthKey === currentMonthKey) {
        monthPendingRevenue += amount
        monthPendingCount += 1
      }
    }
  }

  const recentMonthKeys = buildRecentMonthKeys(now, MONTHLY_CHART_MONTHS)

  const monthlySeries: RevenueMonthPoint[] = recentMonthKeys.map((monthKey) => {
    const bucket = monthRevenueMap.get(monthKey)
    return {
      monthKey,
      label: formatOrderGroupMonthLabel(monthKey),
      revenue: bucket?.revenue ?? 0,
      orderCount: bucket?.orderCount ?? 0,
    }
  })

  const studioShares: StudioProfitShare[] = STUDIO_LOCATIONS.map((option) => {
    const byMonth = studioMonthProfit.get(option.id) ?? new Map<string, number>()
    const monthNetProfit = byMonth.get(currentMonthKey) ?? 0
    let totalNet = 0
    let totalShare = 0
    for (const [, netProfit] of byMonth) {
      totalNet += netProfit
      totalShare += calcStudioShareAmount(netProfit)
    }

    return {
      studio: option.id,
      label: option.label,
      monthNetProfit,
      monthShareAmount: calcStudioShareAmount(monthNetProfit),
      totalNetProfit: totalNet,
      totalShareAmount: totalShare,
      monthlySeries: recentMonthKeys.map((monthKey) => {
        const netProfit = byMonth.get(monthKey) ?? 0
        return {
          monthKey,
          label: formatOrderGroupMonthLabel(monthKey),
          netProfit,
          shareAmount: calcStudioShareAmount(netProfit),
        }
      }),
    }
  })

  return {
    totalRevenue,
    monthRevenue,
    todayRevenue,
    pendingRevenue,
    monthPendingRevenue,
    paidOrderCount,
    pendingOrderCount,
    monthPaidCount,
    monthPendingCount,
    monthlySeries,
    categorySlices: buildCategorySlices(orders),
    totalCost,
    totalNetProfit,
    monthCost,
    monthNetProfit,
    hasCostData: totalCost > 0,
    studioShares,
    monthStudioShareTotal: studioShares.reduce(
      (sum, share) => sum + share.monthShareAmount,
      0
    ),
    totalStudioShareTotal: studioShares.reduce(
      (sum, share) => sum + share.totalShareAmount,
      0
    ),
  }
}

export function formatRevenueAmount(amount: number): string {
  return `NT$ ${Math.round(amount).toLocaleString('zh-TW')}`
}
