import { formatErrorMessage } from '../formatError'
import { normalizeOrder } from '../normalizeOrder'
import { supabase } from '../supabase'
import type { Order, OrderFormData } from '../types'

/** 建立訂單（買家前台 · 超商取件） */
export async function createOrder(
  productId: string,
  totalAmount: number,
  form: OrderFormData
): Promise<Order> {
  const lineName = form.line_name.trim() || null

  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_name: form.buyer_name.trim(),
      line_name: lineName,
      phone: form.phone.trim(),
      cvs_brand: form.cvs_brand,
      cvs_store: form.cvs_store.trim(),
      product_id: productId,
      total_amount: totalAmount,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeOrder(data as Record<string, unknown>)
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
