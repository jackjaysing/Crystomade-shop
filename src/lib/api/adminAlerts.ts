import { formatErrorMessage } from '../formatError'
import { supabase } from '../supabase'

export interface AdminAlertOrder {
  checkoutKey: string
  order_number: string | null
  buyer_name: string
  total_amount: number
  created_at: string
}

export interface AdminAlertMember {
  id: string
  real_name: string
  phone: string
  created_at: string
}

type OrderAlertRow = {
  id: string
  checkout_id: string | null
  order_number: string | null
  buyer_name: string
  total_amount: number
  created_at: string
}

function groupOrdersByCheckout(rows: OrderAlertRow[]): AdminAlertOrder[] {
  const grouped = new Map<string, AdminAlertOrder>()

  for (const row of rows) {
    const checkoutKey = row.checkout_id?.trim() || row.id
    const existing = grouped.get(checkoutKey)
    if (!existing) {
      grouped.set(checkoutKey, {
        checkoutKey,
        order_number: row.order_number,
        buyer_name: row.buyer_name,
        total_amount: row.total_amount,
        created_at: row.created_at,
      })
      continue
    }
    existing.total_amount += row.total_amount
    if (row.created_at > existing.created_at) {
      existing.created_at = row.created_at
    }
    if (!existing.order_number && row.order_number) {
      existing.order_number = row.order_number
    }
  }

  return [...grouped.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** 取得指定時間之後的新訂單（以結帳批次去重） */
export async function fetchNewOrdersSince(since: string): Promise<AdminAlertOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, checkout_id, order_number, buyer_name, total_amount, created_at')
    .is('deleted_at', null)
    .gt('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/deleted_at|42703|column/i.test(msg)) {
      const fallback = await supabase
        .from('orders')
        .select('id, checkout_id, order_number, buyer_name, total_amount, created_at')
        .gt('created_at', since)
        .order('created_at', { ascending: false })
      if (fallback.error) throw new Error(formatErrorMessage(fallback.error))
      return groupOrdersByCheckout((fallback.data ?? []) as OrderAlertRow[])
    }
    throw new Error(msg)
  }

  return groupOrdersByCheckout((data ?? []) as OrderAlertRow[])
}

/** 取得指定時間之後的新註冊會員 */
export async function fetchNewMembersSince(since: string): Promise<AdminAlertMember[]> {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('id, real_name, phone, created_at')
    .gt('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/member_profiles|42P01/i.test(msg)) return []
    throw new Error(msg)
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    real_name: String(row.real_name ?? ''),
    phone: String(row.phone ?? ''),
    created_at: String(row.created_at ?? ''),
  }))
}
