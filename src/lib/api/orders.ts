import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { normalizeOrder } from '../normalizeOrder'
import { supabase } from '../supabase'
import type { CartItem, Order, OrderFormData } from '../types'

async function orderGroupSummary(orderIds: string[], verb: string): Promise<string> {
  if (orderIds.length === 0) return verb

  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .in('id', orderIds)
    .limit(1)

  const orderNumber =
    data?.[0]?.order_number != null ? String(data[0].order_number) : null

  if (orderIds.length === 1 && orderNumber) {
    return `${verb}訂單 ${orderNumber}`
  }
  if (orderNumber) {
    return `${verb}訂單 ${orderNumber} 等 ${orderIds.length} 筆`
  }
  return `${verb}${orderIds.length} 筆訂單`
}

/** 建立訂單（買家前台 · 超商取件 · 原子扣庫存） */
export async function createOrder(
  productId: string,
  totalAmount: number,
  form: OrderFormData,
  checkoutId?: string,
  selectedSize?: string | null
): Promise<Order> {
  const sizeValue = selectedSize?.trim() || null

  const { data, error } = await supabase.rpc('place_order_with_stock', {
    p_product_id: productId,
    p_total_amount: totalAmount,
    p_buyer_name: form.buyer_name.trim(),
    p_line_name: form.line_name.trim(),
    p_phone: form.phone.trim(),
    p_cvs_brand: form.cvs_brand,
    p_cvs_store: form.cvs_store.trim(),
    p_checkout_id: checkoutId ?? null,
    p_selected_size: sizeValue,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (
      msg.includes('idx_orders_order_number') ||
      (msg.includes('duplicate key') && msg.includes('order_number'))
    ) {
      throw new Error(
        '訂單編號索引設定錯誤：請在 Supabase SQL Editor 執行 supabase/migration-fix-order-number-unique.sql'
      )
    }
    if (msg.includes('place_order_with_stock') || msg.includes('function')) {
      throw new Error(
        '資料庫尚未啟用最新訂單功能，請在 Supabase SQL Editor 依序執行 supabase/migration-add-stock.sql、migration-add-order-number.sql 與 migration-add-order-selected-size.sql'
      )
    }
    if (msg.includes('selected_size') || msg.includes('p_selected_size')) {
      throw new Error(
        '資料庫尚未啟用手圍規格欄位，請在 Supabase SQL Editor 執行 supabase/migration-add-order-selected-size.sql'
      )
    }
    throw new Error(msg)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('此商品已售罄，無法下單')
  return normalizeOrder(row as Record<string, unknown>)
}

/** 購物車批次下單（運費計入第一筆訂單） */
export async function createOrdersFromCart(
  items: CartItem[],
  form: OrderFormData,
  shippingFee: number
): Promise<Order[]> {
  const orders: Order[] = []
  let shippingAssigned = false
  const checkoutId = crypto.randomUUID()

  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const includeShipping = !shippingAssigned && shippingFee > 0
      const amount = item.price + (includeShipping ? shippingFee : 0)
      if (includeShipping) shippingAssigned = true

      const order = await createOrder(
        item.productId,
        amount,
        form,
        checkoutId,
        item.selectedSize
      )
      orders.push(order)
    }
  }

  if (!shippingAssigned && shippingFee > 0 && orders.length === 0) {
    throw new Error('購物車是空的，無法下單')
  }

  return orders
}

const ORDER_SELECT = `
  *,
  products ( name, image_url, category )
`

function mapOrderRows(data: unknown[] | null): Order[] {
  return (data ?? []).map((row) =>
    normalizeOrder(row as Record<string, unknown>)
  )
}

function isMissingOrderSoftDeleteColumn(message: string): boolean {
  return /deleted_at|deleted_from_status|column/i.test(message)
}

/** 後台：取得未刪除訂單（最新優先） */
export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingOrderSoftDeleteColumn(msg)) {
      const fallback = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .order('created_at', { ascending: false })
      if (fallback.error) throw new Error(formatErrorMessage(fallback.error))
      return mapOrderRows(fallback.data)
    }
    throw new Error(msg)
  }
  return mapOrderRows(data)
}

/** 後台：取得已軟刪除訂單 */
export async function fetchDeletedOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingOrderSoftDeleteColumn(msg)) {
      return []
    }
    throw new Error(msg)
  }
  return mapOrderRows(data)
}

/** 後台：一鍵出貨 */
export async function shipOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'shipped' })
    .eq('id', orderId)

  if (error) throw new Error(formatErrorMessage(error))

  void recordAdminActivity({
    action: 'status',
    entityType: 'order',
    entityId: orderId,
    summary: await orderGroupSummary([orderId], '標記出貨：'),
  })
}

/** 後台：同一結帳批次一鍵出貨 */
export async function shipOrderGroup(orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return

  const { error } = await supabase
    .from('orders')
    .update({ status: 'shipped' })
    .in('id', orderIds)
    .eq('status', 'pending')

  if (error) throw new Error(formatErrorMessage(error))

  void recordAdminActivity({
    action: 'status',
    entityType: 'order',
    summary: await orderGroupSummary(orderIds, '標記出貨：'),
  })
}

/** 後台：同一結帳批次改回未出貨 */
export async function unshipOrderGroup(orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return

  const { error } = await supabase
    .from('orders')
    .update({ status: 'pending' })
    .in('id', orderIds)
    .eq('status', 'shipped')

  if (error) throw new Error(formatErrorMessage(error))

  void recordAdminActivity({
    action: 'status',
    entityType: 'order',
    summary: await orderGroupSummary(orderIds, '改回未出貨：'),
  })
}

/** 後台：整筆訂單標記已付款 */
export async function markOrderGroupPaid(orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return

  const { error } = await supabase
    .from('orders')
    .update({ is_paid: true })
    .in('id', orderIds)

  if (error) throw new Error(formatErrorMessage(error))

  void recordAdminActivity({
    action: 'status',
    entityType: 'order',
    summary: await orderGroupSummary(orderIds, '標記已付款：'),
  })
}

/** 後台：整筆訂單改回未付款 */
export async function markOrderGroupUnpaid(orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return

  const { error } = await supabase
    .from('orders')
    .update({ is_paid: false })
    .in('id', orderIds)

  if (error) throw new Error(formatErrorMessage(error))

  void recordAdminActivity({
    action: 'status',
    entityType: 'order',
    summary: await orderGroupSummary(orderIds, '改回未付款：'),
  })
}

/** 後台：更新同一結帳批次的寄件單號（空字串則清除） */
export async function updateOrderGroupTrackingNumber(
  orderIds: string[],
  trackingNumber: string
): Promise<void> {
  if (orderIds.length === 0) return

  const value = trackingNumber.trim() || null

  const { error } = await supabase
    .from('orders')
    .update({ tracking_number: value })
    .in('id', orderIds)

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('tracking_number') || msg.includes('column')) {
      throw new Error(
        '資料庫尚未啟用寄件單號欄位，請在 Supabase SQL Editor 執行 supabase/migration-add-order-tracking-number.sql'
      )
    }
    throw new Error(msg)
  }

  const summary = await orderGroupSummary(orderIds, '更新寄件單號：')
  void recordAdminActivity({
    action: 'update',
    entityType: 'order',
    summary: value ? `${summary} ${value}` : `${summary}（已清除）`,
  })
}

/** 後台：軟刪除訂單群組（需先通過驗證碼確認） */
export async function softDeleteOrderGroup(
  orderIds: string[]
): Promise<number> {
  if (orderIds.length === 0) return 0

  const { data, error } = await supabase.rpc('soft_delete_order_group', {
    p_order_ids: orderIds,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('soft_delete_order_group') || msg.includes('function')) {
      throw new Error(
        '資料庫尚未啟用訂單刪除功能，請在 Supabase SQL Editor 執行 supabase/migration-add-order-soft-delete.sql'
      )
    }
    throw new Error(msg)
  }

  const count = typeof data === 'number' ? data : Number(data) || 0

  void recordAdminActivity({
    action: 'delete',
    entityType: 'order',
    summary: await orderGroupSummary(orderIds, '刪除訂單：'),
  })

  return count
}

/** 後台：恢復已軟刪除訂單群組 */
export async function restoreOrderGroup(orderIds: string[]): Promise<number> {
  if (orderIds.length === 0) return 0

  const { data, error } = await supabase.rpc('restore_order_group', {
    p_order_ids: orderIds,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('restore_order_group') || msg.includes('function')) {
      throw new Error(
        '資料庫尚未啟用訂單恢復功能，請在 Supabase SQL Editor 執行 supabase/migration-add-order-soft-delete.sql'
      )
    }
    throw new Error(msg)
  }

  const count = typeof data === 'number' ? data : Number(data) || 0

  void recordAdminActivity({
    action: 'restore',
    entityType: 'order',
    summary: await orderGroupSummary(orderIds, '恢復訂單：'),
  })

  return count
}

/** 後台：取消訂單群組（還原庫存） */
export async function cancelOrderGroup(orderIds: string[]): Promise<number> {
  if (orderIds.length === 0) return 0

  const { data, error } = await supabase.rpc('cancel_order_group', {
    p_order_ids: orderIds,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('cancel_order_group') || msg.includes('function')) {
      throw new Error(
        '資料庫尚未啟用取消訂單功能，請在 Supabase SQL Editor 執行 supabase/migration-add-order-cancel.sql'
      )
    }
    throw new Error(msg)
  }

  const count = typeof data === 'number' ? data : Number(data) || 0

  void recordAdminActivity({
    action: 'status',
    entityType: 'order',
    summary: await orderGroupSummary(orderIds, '取消訂單：'),
  })

  return count
}
