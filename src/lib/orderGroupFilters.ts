import type { OrderGroup } from './groupOrders'
import {
  filterOrderGroups,
  type OrderGroupFilter,
} from './groupOrders'

export const ORDER_MONTH_ALL = 'all'

/** 訂單建立時間的月份鍵（YYYY-MM，本地時區） */
export function getOrderGroupMonthKey(createdAt: string): string {
  const date = new Date(createdAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/** 月份選項顯示文字 */
export function formatOrderGroupMonthLabel(monthKey: string): string {
  if (monthKey === ORDER_MONTH_ALL) return '全部月份'
  const [year, month] = monthKey.split('-')
  return `${year}年${Number(month)}月`
}

/** 依訂單時間列出可選月份（新到舊） */
export function listOrderGroupMonthKeys(groups: OrderGroup[]): string[] {
  const keys = new Set<string>()
  for (const group of groups) {
    keys.add(getOrderGroupMonthKey(group.created_at))
  }
  return Array.from(keys).sort((a, b) => b.localeCompare(a))
}

export function countOrderGroupsInMonth(
  groups: OrderGroup[],
  monthKey: string
): number {
  if (monthKey === ORDER_MONTH_ALL) return groups.length
  return groups.filter(
    (group) => getOrderGroupMonthKey(group.created_at) === monthKey
  ).length
}

/** 依月份篩選 */
export function filterOrderGroupsByMonth(
  groups: OrderGroup[],
  monthKey: string
): OrderGroup[] {
  if (monthKey === ORDER_MONTH_ALL) return groups
  return groups.filter(
    (group) => getOrderGroupMonthKey(group.created_at) === monthKey
  )
}

/** 訂單編號搜尋（含結帳 ID，不分大小寫） */
export function matchesOrderNumberSearch(
  group: OrderGroup,
  query: string
): boolean {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return true

  const orderNumber = group.orderNumber?.trim().toLowerCase() ?? ''
  const groupId = group.id.toLowerCase()

  return orderNumber.includes(keyword) || groupId.includes(keyword)
}

/** 月份 → 編號搜尋 → 狀態分類 */
export function applyOrderGroupListFilters(
  groups: OrderGroup[],
  options: {
    monthKey: string
    searchQuery: string
    statusFilter: OrderGroupFilter
  }
): OrderGroup[] {
  let result = filterOrderGroupsByMonth(groups, options.monthKey)

  if (options.searchQuery.trim()) {
    result = result.filter((group) =>
      matchesOrderNumberSearch(group, options.searchQuery)
    )
  }

  return filterOrderGroups(result, options.statusFilter)
}
