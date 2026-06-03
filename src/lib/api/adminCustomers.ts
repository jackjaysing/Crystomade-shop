import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { normalizePhone, formatPhoneDisplay } from '../phoneAuth'
import { supabase } from '../supabase'
import type { AdminGuestCustomer, AdminRegisteredCustomer } from '../types'

function normalizeMemberRow(row: Record<string, unknown>): AdminRegisteredCustomer {
  return {
    id: String(row.id ?? ''),
    real_name: String(row.real_name ?? ''),
    phone: String(row.phone ?? ''),
    birthday: String(row.birthday ?? '').slice(0, 10),
    points: typeof row.points === 'number' ? row.points : Number(row.points) || 0,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    order_count: 0,
    last_order_at: null,
    total_spent: 0,
  }
}

function enrichRegisteredWithOrders(
  members: AdminRegisteredCustomer[],
  orders: Array<{
    user_id: string | null
    total_amount: number
    created_at: string
    status: string
  }>
): AdminRegisteredCustomer[] {
  const stats = new Map<
    string,
    { count: number; spent: number; lastAt: string | null }
  >()

  for (const order of orders) {
    if (!order.user_id || order.status === 'cancelled') continue
    const cur = stats.get(order.user_id) ?? {
      count: 0,
      spent: 0,
      lastAt: null,
    }
    cur.count += 1
    cur.spent += order.total_amount
    if (!cur.lastAt || order.created_at > cur.lastAt) {
      cur.lastAt = order.created_at
    }
    stats.set(order.user_id, cur)
  }

  return members.map((m) => {
    const s = stats.get(m.id)
    if (!s) return m
    return {
      ...m,
      order_count: s.count,
      total_spent: s.spent,
      last_order_at: s.lastAt,
    }
  })
}

/** 後台：已註冊會員列表 */
export async function fetchRegisteredCustomers(): Promise<
  AdminRegisteredCustomer[]
> {
  const { data: profiles, error: profileError } = await supabase
    .from('member_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (profileError) {
    const msg = formatErrorMessage(profileError)
    if (/member_profiles|42P01/i.test(msg)) {
      throw new Error(
        '資料庫尚未啟用會員功能，請執行 supabase/migration-add-member-points.sql'
      )
    }
    if (/row-level security|RLS/i.test(msg)) {
      throw new Error(
        '後台無法讀取會員資料，請執行 supabase/migration-add-admin-customers.sql'
      )
    }
    throw new Error(msg)
  }

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('user_id, total_amount, created_at, status')
    .not('user_id', 'is', null)
    .is('deleted_at', null)

  if (orderError) throw new Error(formatErrorMessage(orderError))

  const members = (profiles ?? []).map((row) =>
    normalizeMemberRow(row as Record<string, unknown>)
  )

  return enrichRegisteredWithOrders(
    members,
    (orders ?? []).map((o) => ({
      user_id: o.user_id != null ? String(o.user_id) : null,
      total_amount: Number(o.total_amount) || 0,
      created_at: String(o.created_at),
      status: String(o.status),
    }))
  )
}

/** 後台：未註冊客戶（訪客訂單依電話彙總） */
export async function fetchGuestCustomers(): Promise<AdminGuestCustomer[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('buyer_name, line_name, phone, total_amount, created_at, status')
    .is('user_id', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(formatErrorMessage(error))

  const { data: members } = await supabase.from('member_profiles').select('phone')
  const registeredPhones = new Set(
    (members ?? []).map((m) => normalizePhone(String(m.phone ?? '')))
  )

  const map = new Map<string, AdminGuestCustomer>()

  for (const row of orders ?? []) {
    if (row.status === 'cancelled') continue

    const phoneRaw = String(row.phone ?? '').trim()
    const phoneKey = normalizePhone(phoneRaw)
    if (!phoneKey) continue
    if (registeredPhones.has(phoneKey)) continue

    const amount = Number(row.total_amount) || 0
    const createdAt = String(row.created_at)
    const existing = map.get(phoneKey)

    if (!existing) {
      map.set(phoneKey, {
        id: phoneKey,
        buyer_name: String(row.buyer_name ?? ''),
        phone: phoneRaw,
        line_name: row.line_name != null ? String(row.line_name) : null,
        order_count: 1,
        last_order_at: createdAt,
        total_spent: amount,
      })
      continue
    }

    existing.order_count += 1
    existing.total_spent += amount
    if (createdAt > (existing.last_order_at ?? '')) {
      existing.last_order_at = createdAt
      existing.buyer_name = String(row.buyer_name ?? existing.buyer_name)
      existing.line_name =
        row.line_name != null ? String(row.line_name) : existing.line_name
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.last_order_at ?? '').localeCompare(a.last_order_at ?? '')
  )
}

/** 後台：調整會員點數 */
export async function adminUpdateMemberPoints(
  userId: string,
  newPoints: number,
  reason: string
): Promise<AdminRegisteredCustomer> {
  const points = Math.max(0, Math.floor(newPoints))
  const note = reason.trim() || '後台調整點數'

  const { data, error } = await supabase.rpc('admin_set_member_points', {
    p_user_id: userId,
    p_new_points: points,
    p_reason: note,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/admin_set_member_points|function/i.test(msg)) {
      throw new Error(
        '後台調整點數功能未啟用，請執行 supabase/migration-add-admin-customers.sql'
      )
    }
    throw new Error(msg)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('更新失敗')

  void recordAdminActivity({
    action: 'update',
    entityType: 'product',
    entityId: userId,
    summary: `調整會員點數為 ${points}：${note}`,
  })

  const profile = normalizeMemberRow(row as Record<string, unknown>)
  return { ...profile, order_count: 0, last_order_at: null, total_spent: 0 }
}

export { formatPhoneDisplay }
