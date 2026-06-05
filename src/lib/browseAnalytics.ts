import type { PageViewTimeSlot, ProductViewStats } from './api/analytics'
import type { Product } from './types'

export type ProductViewMetric = 'today' | 'total'

export interface ProductViewRankRow {
  productId: string
  name: string
  imageUrl: string | null
  count: number
}

export interface BrowseHeatmapCell {
  dayOfWeek: number
  hour: number
  count: number
}

/** ISO 週一至週日（1–7） */
export const BROWSE_WEEKDAY_LABELS: Record<number, string> = {
  1: '週一',
  2: '週二',
  3: '週三',
  4: '週四',
  5: '週五',
  6: '週六',
  7: '週日',
}

export const BROWSE_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 7] as const

export function buildProductViewRanking(
  products: Product[],
  stats: ProductViewStats[],
  metric: ProductViewMetric,
  limit = 15
): ProductViewRankRow[] {
  const productById = new Map(products.map((p) => [p.id, p]))
  const rows = stats
    .map((item) => {
      const product = productById.get(item.productId)
      return {
        productId: item.productId,
        name: product?.name ?? '（已刪除商品）',
        imageUrl: product?.image_url ?? null,
        count: metric === 'today' ? item.todayCount : item.totalCount,
      }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)

  return rows.slice(0, limit)
}

export function buildBrowseHeatmapCells(slots: PageViewTimeSlot[]): BrowseHeatmapCell[] {
  const countMap = new Map<string, number>()
  for (const slot of slots) {
    countMap.set(`${slot.dayOfWeek}-${slot.hour}`, slot.viewCount)
  }

  const cells: BrowseHeatmapCell[] = []
  for (const dayOfWeek of BROWSE_WEEKDAY_ORDER) {
    for (let hour = 0; hour < 24; hour += 1) {
      cells.push({
        dayOfWeek,
        hour,
        count: countMap.get(`${dayOfWeek}-${hour}`) ?? 0,
      })
    }
  }
  return cells
}

export function summarizeViewsByWeekday(
  cells: BrowseHeatmapCell[]
): { dayOfWeek: number; label: string; count: number }[] {
  return BROWSE_WEEKDAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    label: BROWSE_WEEKDAY_LABELS[dayOfWeek],
    count: cells
      .filter((cell) => cell.dayOfWeek === dayOfWeek)
      .reduce((sum, cell) => sum + cell.count, 0),
  }))
}

export function summarizeViewsByHour(
  cells: BrowseHeatmapCell[]
): { hour: number; label: string; count: number }[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour}時`,
    count: cells
      .filter((cell) => cell.hour === hour)
      .reduce((sum, cell) => sum + cell.count, 0),
  }))
}
