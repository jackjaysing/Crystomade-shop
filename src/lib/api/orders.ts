import { supabase } from '../supabase'
import type { Order, OrderFormData } from '../types'

/** 建立訂單（買家前台） */
export async function createOrder(
  productId: string,
  totalAmount: number,
  form: OrderFormData
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_name: form.buyer_name,
      phone: form.phone,
      address: form.address,
      product_id: productId,
      total_amount: totalAmount,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as Order
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

  if (error) throw error
  return (data ?? []) as Order[]
}

/** 後台：一鍵出貨 */
export async function shipOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'shipped' })
    .eq('id', orderId)

  if (error) throw error
}
