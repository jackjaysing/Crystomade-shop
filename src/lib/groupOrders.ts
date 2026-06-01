import type { CvsBrand, Order, OrderPaymentStatus, OrderStatus } from './types'

export type OrderGroupStatus = OrderStatus | 'partial'

export interface OrderLineItem {
  productId: string
  productName: string
  imageUrl?: string
  quantity: number
  lineTotal: number
}

/** 後台合併顯示的訂單群組（同一結帳） */
export interface OrderGroup {
  id: string
  orderNumber: string | null
  created_at: string
  buyer_name: string
  line_name: string | null
  phone: string
  cvs_brand: CvsBrand
  cvs_store: string
  lineItems: OrderLineItem[]
  orderIds: string[]
  pendingOrderIds: string[]
  totalAmount: number
  itemCount: number
  status: OrderGroupStatus
  paymentStatus: OrderPaymentStatus
}

const LEGACY_GROUP_WINDOW_MS = 2 * 60 * 1000

function matchesIdentity(a: Order, b: Order): boolean {
  return (
    a.buyer_name === b.buyer_name &&
    a.phone === b.phone &&
    a.cvs_brand === b.cvs_brand &&
    a.cvs_store === b.cvs_store &&
    (a.line_name ?? '') === (b.line_name ?? '')
  )
}

function buildLineItems(orders: Order[]): OrderLineItem[] {
  const map = new Map<string, OrderLineItem>()

  for (const order of orders) {
    const key = order.product_id || order.product_name || order.id
    const productName =
      order.products?.name ?? order.product_name ?? '（商品已刪除）'
    const imageUrl = order.products?.image_url ?? order.product_image_url ?? undefined
    const existing = map.get(key)
    if (existing) {
      existing.quantity += 1
      existing.lineTotal += order.total_amount
      continue
    }

    map.set(key, {
      productId: order.product_id || key,
      productName,
      imageUrl,
      quantity: 1,
      lineTotal: order.total_amount,
    })
  }

  return Array.from(map.values())
}

function resolveGroupStatus(orders: Order[]): OrderGroupStatus {
  const shippedCount = orders.filter((order) => order.status === 'shipped').length
  if (shippedCount === 0) return 'pending'
  if (shippedCount === orders.length) return 'shipped'
  return 'partial'
}

function resolvePaymentStatus(orders: Order[]): OrderPaymentStatus {
  const paidCount = orders.filter((order) => order.is_paid).length
  if (paidCount === 0) return 'unpaid'
  if (paidCount === orders.length) return 'paid'
  return 'partial'
}

function buildOrderGroup(id: string, orders: Order[]): OrderGroup {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const lineItems = buildLineItems(sorted)

  return {
    id,
    orderNumber: sorted.find((order) => order.order_number)?.order_number ?? null,
    created_at: sorted[0].created_at,
    buyer_name: sorted[0].buyer_name,
    line_name: sorted[0].line_name,
    phone: sorted[0].phone,
    cvs_brand: sorted[0].cvs_brand,
    cvs_store: sorted[0].cvs_store,
    lineItems,
    orderIds: sorted.map((order) => order.id),
    pendingOrderIds: sorted
      .filter((order) => order.status === 'pending')
      .map((order) => order.id),
    totalAmount: sorted.reduce((sum, order) => sum + order.total_amount, 0),
    itemCount: sorted.length,
    status: resolveGroupStatus(sorted),
    paymentStatus: resolvePaymentStatus(sorted),
  }
}

function groupLegacyOrders(orders: Order[]): OrderGroup[] {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const groups: OrderGroup[] = []
  let batch: Order[] = []

  const flush = () => {
    if (batch.length === 0) return
    groups.push(buildOrderGroup(batch[0].id, batch))
    batch = []
  }

  for (const order of sorted) {
    if (batch.length === 0) {
      batch = [order]
      continue
    }

    const batchStart = batch[0].created_at
    const timeDiff = Math.abs(
      new Date(order.created_at).getTime() - new Date(batchStart).getTime()
    )

    if (matchesIdentity(order, batch[0]) && timeDiff <= LEGACY_GROUP_WINDOW_MS) {
      batch.push(order)
    } else {
      flush()
      batch = [order]
    }
  }

  flush()
  return groups
}

/** 將多筆訂單列合併為同一結帳群組 */
export function groupOrders(orders: Order[]): OrderGroup[] {
  const withCheckout = new Map<string, Order[]>()
  const withoutCheckout: Order[] = []

  for (const order of orders) {
    if (order.checkout_id) {
      const list = withCheckout.get(order.checkout_id) ?? []
      list.push(order)
      withCheckout.set(order.checkout_id, list)
    } else {
      withoutCheckout.push(order)
    }
  }

  const groups: OrderGroup[] = []

  for (const [checkoutId, checkoutOrders] of withCheckout) {
    groups.push(buildOrderGroup(checkoutId, checkoutOrders))
  }

  groups.push(...groupLegacyOrders(withoutCheckout))

  return groups.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function formatOrderGroupStatus(status: OrderGroupStatus): string {
  if (status === 'shipped') return '已出貨'
  if (status === 'partial') return '部分出貨'
  return '待出貨'
}

export function formatOrderPaymentStatus(status: OrderPaymentStatus): string {
  if (status === 'paid') return '已付款'
  if (status === 'partial') return '部分已付款'
  return '未付款'
}

/** 後台訂單明細分類 */
export type OrderGroupFilter = 'all' | 'paid' | 'unpaid' | 'shipped' | 'unshipped'

export const ORDER_GROUP_FILTERS: { id: OrderGroupFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'paid', label: '已結帳' },
  { id: 'unpaid', label: '未結帳' },
  { id: 'shipped', label: '已出貨' },
  { id: 'unshipped', label: '未出貨' },
]

export function matchesOrderGroupFilter(
  group: OrderGroup,
  filter: OrderGroupFilter
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'paid':
      return group.paymentStatus === 'paid'
    case 'unpaid':
      return group.paymentStatus !== 'paid'
    case 'shipped':
      return group.status === 'shipped'
    case 'unshipped':
      return group.status !== 'shipped'
  }
}

export function filterOrderGroups(
  groups: OrderGroup[],
  filter: OrderGroupFilter
): OrderGroup[] {
  if (filter === 'all') return groups
  return groups.filter((group) => matchesOrderGroupFilter(group, filter))
}

export function countOrderGroupsByFilter(
  groups: OrderGroup[]
): Record<OrderGroupFilter, number> {
  const counts: Record<OrderGroupFilter, number> = {
    all: groups.length,
    paid: 0,
    unpaid: 0,
    shipped: 0,
    unshipped: 0,
  }

  for (const group of groups) {
    if (matchesOrderGroupFilter(group, 'paid')) counts.paid += 1
    if (matchesOrderGroupFilter(group, 'unpaid')) counts.unpaid += 1
    if (matchesOrderGroupFilter(group, 'shipped')) counts.shipped += 1
    if (matchesOrderGroupFilter(group, 'unshipped')) counts.unshipped += 1
  }

  return counts
}
