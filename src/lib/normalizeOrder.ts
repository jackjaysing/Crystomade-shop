import type { Order, OrderFormData, ProductCategory } from './types'

function parseProductCategory(value: unknown): ProductCategory | undefined {
  if (value === '手串' || value === '擺件' || value === '礦石') return value
  return undefined
}

function resolveOrderProduct(
  row: Record<string, unknown>
): Order['products'] {
  const joined = row.products as Order['products'] | null
  const category =
    parseProductCategory(
      (joined as { category?: unknown } | null)?.category ?? row.product_category
    ) ?? undefined

  if (joined?.name) {
    return { ...joined, category: joined.category ?? category }
  }

  const snapshotName = row.product_name != null ? String(row.product_name) : ''
  if (!snapshotName) return joined ?? null

  return {
    name: snapshotName,
    image_url:
      row.product_image_url != null ? String(row.product_image_url) : '',
    category,
  }
}

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
    product_id: row.product_id != null ? String(row.product_id) : '',
    product_name: row.product_name != null ? String(row.product_name) : null,
    product_image_url:
      row.product_image_url != null ? String(row.product_image_url) : null,
    total_amount:
      typeof row.total_amount === 'number'
        ? row.total_amount
        : Number(row.total_amount) || 0,
    status:
      row.status === 'shipped'
        ? 'shipped'
        : row.status === 'cancelled'
          ? 'cancelled'
          : 'pending',
    is_paid: Boolean(row.is_paid),
    checkout_id: row.checkout_id != null ? String(row.checkout_id) : null,
    order_number: row.order_number != null ? String(row.order_number) : null,
    tracking_number:
      row.tracking_number != null ? String(row.tracking_number) : null,
    deleted_at: row.deleted_at != null ? String(row.deleted_at) : null,
    deleted_from_status:
      row.deleted_from_status === 'pending' ||
      row.deleted_from_status === 'shipped' ||
      row.deleted_from_status === 'cancelled'
        ? row.deleted_from_status
        : null,
    products: resolveOrderProduct(row),
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
