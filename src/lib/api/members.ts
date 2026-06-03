import type { Session, User } from '@supabase/supabase-js'
import { formatErrorMessage } from '../formatError'
import {
  formatPhoneDisplay,
  normalizePhone,
  phoneToAuthEmail,
} from '../phoneAuth'
import { normalizeOrder } from '../normalizeOrder'
import { supabase } from '../supabase'
import type { MemberProfile, Order, PointsHistoryEntry } from '../types'
import {
  memberRegisterMetadata,
  validateMemberLogin,
  validateMemberRegister,
  type MemberLoginInput,
  type MemberRegisterInput,
} from '../validateMember'

function normalizeProfile(row: Record<string, unknown>): MemberProfile {
  return {
    id: String(row.id ?? ''),
    real_name: String(row.real_name ?? ''),
    phone: String(row.phone ?? ''),
    birthday: String(row.birthday ?? '').slice(0, 10),
    points: typeof row.points === 'number' ? row.points : Number(row.points) || 0,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function normalizePointsHistory(row: Record<string, unknown>): PointsHistoryEntry {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    delta: typeof row.delta === 'number' ? row.delta : Number(row.delta) || 0,
    balance_after:
      typeof row.balance_after === 'number'
        ? row.balance_after
        : Number(row.balance_after) || 0,
    description: String(row.description ?? ''),
    checkout_id: row.checkout_id != null ? String(row.checkout_id) : null,
    order_number: row.order_number != null ? String(row.order_number) : null,
    created_at: String(row.created_at ?? ''),
  }
}

export async function signUpMember(input: MemberRegisterInput): Promise<User> {
  const validationError = validateMemberRegister(input)
  if (validationError) throw new Error(validationError)

  const phone = normalizePhone(input.phone)
  const email = phoneToAuthEmail(phone)

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: memberRegisterMetadata(input),
    },
  })

  if (error) throw new Error(formatErrorMessage(error))
  if (!data.user) throw new Error('註冊失敗，請稍後再試')

  await ensureMemberProfile(data.user, input)
  return data.user
}

async function ensureMemberProfile(
  user: User,
  input: MemberRegisterInput
): Promise<void> {
  const phone = normalizePhone(input.phone)

  const { error } = await supabase.rpc('member_register_finalize', {
    p_user_id: user.id,
    p_real_name: input.realName.trim(),
    p_phone: phone,
    p_birthday: input.birthday,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/member_register_finalize|function/i.test(msg)) {
      throw new Error(
        '註冊贈點功能未啟用，請在 Supabase SQL Editor 執行 supabase/migration-fix-member-welcome-bonus.sql'
      )
    }
    if (msg.includes('member_profiles') || msg.includes('relation')) {
      throw new Error(
        '資料庫尚未啟用會員功能，請在 Supabase SQL Editor 執行 supabase/migration-add-member-points.sql'
      )
    }
    if (msg.includes('duplicate') || msg.includes('phone')) {
      throw new Error('此手機號碼已註冊，請直接登入')
    }
    throw new Error(msg)
  }
}

export async function signInMember(input: MemberLoginInput): Promise<Session> {
  const validationError = validateMemberLogin(input)
  if (validationError) throw new Error(validationError)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToAuthEmail(input.phone),
    password: input.password,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('Invalid login') || msg.includes('credentials')) {
      throw new Error('手機或密碼錯誤')
    }
    throw new Error(msg)
  }
  if (!data.session) throw new Error('登入失敗，請稍後再試')
  return data.session
}

export async function signOutMember(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(formatErrorMessage(error))
}

export async function fetchMemberProfile(
  userId: string
): Promise<MemberProfile | null> {
  const { data, error } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('member_profiles') || msg.includes('relation')) {
      return null
    }
    throw new Error(msg)
  }
  if (!data) return null
  return normalizeProfile(data as Record<string, unknown>)
}

export async function fetchPointsHistory(
  userId: string,
  limit = 30
): Promise<PointsHistoryEntry[]> {
  const { data, error } = await supabase
    .from('points_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    const msg = formatErrorMessage(error)
    if (msg.includes('points_history') || msg.includes('relation')) {
      return []
    }
    throw new Error(msg)
  }

  return (data ?? []).map((row) =>
    normalizePointsHistory(row as Record<string, unknown>)
  )
}

export async function syncMemberProfileFromCheckout(
  userId: string,
  buyerName: string,
  phone: string
): Promise<void> {
  const normalized = normalizePhone(phone)
  const { error } = await supabase
    .from('member_profiles')
    .update({
      real_name: buyerName.trim(),
      phone: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.warn('syncMemberProfileFromCheckout', formatErrorMessage(error))
  }
}

const MEMBER_ORDER_SELECT = `
  *,
  products ( name, image_url, category )
`

export async function fetchMemberOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(MEMBER_ORDER_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(formatErrorMessage(error))

  return (data ?? []).map((row) =>
    normalizeOrder(row as Record<string, unknown>)
  )
}

export function profileToOrderPrefill(profile: MemberProfile) {
  return {
    buyer_name: profile.real_name,
    phone: formatPhoneDisplay(profile.phone),
    line_name: '',
  }
}
