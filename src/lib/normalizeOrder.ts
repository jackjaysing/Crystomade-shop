import type { Order, OrderFormData } from './types'

/** 將 Supabase 訂單列整理為前端型別 */
export function normalizeOrder(row: Record<string, unknown>): Order {
  const brand = String(row.cvs_brand ?? '')
  const cvsBrand =
    brand === '7-11' || brand === '全家' ? brand : ('7-11' as Order['cvs_brand'])

  return {
    id: String(row.id ?? ''),
    created_at: String(row.created_at ?? ''),
    buyer_name: String(row.buyer_name ?? ''),
    line_name: row.line_name != null ? String(row.line_name) : null,
    phone: String(row.phone ?? ''),
    cvs_brand: cvsBrand,
    cvs_store: String(row.cvs_store ?? row.address ?? ''),
    product_id: String(row.product_id ?? ''),
    total_amount:
      typeof row.total_amount === 'number'
        ? row.total_amount
        : Number(row.total_amount) || 0,
    status: row.status === 'shipped' ? 'shipped' : 'pending',
    checkout_id: row.checkout_id != null ? String(row.checkout_id) : null,
    products: row.products as Order['products'],
  }
}

/** 表單驗證 */
export function validateOrderForm(form: OrderFormData): string | null {
  if (!form.buyer_name.trim()) return '請填寫姓名'
  if (!form.phone.trim()) return '請填寫聯絡電話'
  if (!form.cvs_brand) return '請選擇收件超商'
  if (!form.cvs_store.trim()) return '請填寫收件門市'
  return null
}
