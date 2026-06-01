import { formatErrorMessage } from '../formatError'
import { normalizeOrder } from '../normalizeOrder'
import { supabase } from '../supabase'
import type { CartItem, Order, OrderFormData } from '../types'

/** 建立訂單（買家前台 · 超商取件 · 原子扣庫存） */
export async function createOrder(
  productId: string,
  totalAmount: number,
  form: OrderFormData
): Promise<Order> {
  const { data, error } = await supabase.rpc('place_order_with_stock', {
    p_product_id: productId,
    p_total_amount: totalAmount,
    p_buyer_name: form.buyer_name.trim(),
    p_line_name: form.line_name.trim(),
    p_phone: form.phone.trim(),
    p_cvs_brand: form.cvs_brand,
    p_cvs_store: form.cvs_store.trim(),
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('place_order_with_stock') || msg.includes('function')) {
      throw new Error(
        '資料庫尚未啟用庫存功能，請在 Supabase SQL Editor 執行 supabase/migration-add-stock.sql'
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

  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const includeShipping = !shippingAssigned && shippingFee > 0
      const amount = item.price + (includeShipping ? shippingFee : 0)
      if (includeShipping) shippingAssigned = true

      const order = await createOrder(item.productId, amount, form)
      orders.push(order)
    }
  }

  if (!shippingAssigned && shippingFee > 0 && orders.length === 0) {
    throw new Error('購物車是空的，無法下單')
  }

  return orders
}

/** 後台：取得所有訂單（最新優先，含商品名稱） */
export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      products ( name, image_url )
    `
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(formatErrorMessage(error))
  return (data ?? []).map((row) =>
    normalizeOrder(row as Record<string, unknown>)
  )
}

/** 後台：一鍵出貨 */
export async function shipOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'shipped' })
    .eq('id', orderId)

  if (error) throw new Error(formatErrorMessage(error))
}
