import { formatErrorMessage } from '../formatError'
import { supabase } from '../supabase'
import type {
  Coupon,
  CouponFormData,
  MemberCoupon,
  MemberCouponWithDefinition,
} from '../types'

function normalizeCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    coupon_type: String(row.coupon_type) as Coupon['coupon_type'],
    min_purchase_amount: Number(row.min_purchase_amount) || 0,
    discount_amount:
      row.discount_amount != null ? Number(row.discount_amount) : null,
    discount_zhe: row.discount_zhe != null ? Number(row.discount_zhe) : null,
    gift_description:
      row.gift_description != null ? String(row.gift_description) : null,
    is_active: Boolean(row.is_active),
    valid_days: row.valid_days != null ? Number(row.valid_days) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function normalizeMemberCoupon(row: Record<string, unknown>): MemberCoupon {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    coupon_id: String(row.coupon_id ?? ''),
    status: String(row.status) as MemberCoupon['status'],
    issued_at: String(row.issued_at ?? ''),
    expires_at: row.expires_at != null ? String(row.expires_at) : null,
    used_at: row.used_at != null ? String(row.used_at) : null,
    checkout_id: row.checkout_id != null ? String(row.checkout_id) : null,
  }
}

function couponInsertPayload(data: CouponFormData) {
  return {
    title: data.title.trim(),
    description: data.description.trim(),
    coupon_type: data.coupon_type,
    min_purchase_amount: Math.max(0, data.min_purchase_amount),
    discount_amount:
      data.coupon_type === 'fixed_discount' ? data.discount_amount : null,
    discount_zhe:
      data.coupon_type === 'percent_discount' ? data.discount_zhe : null,
    gift_description:
      data.coupon_type === 'gift' ? data.gift_description?.trim() || null : null,
    is_active: data.is_active,
    valid_days: data.valid_days && data.valid_days > 0 ? data.valid_days : null,
    updated_at: new Date().toISOString(),
  }
}

function migrationHint(msg: string): string | null {
  if (/coupons|member_coupons|42P01|42703/i.test(msg)) {
    return '請在 Supabase SQL Editor 執行 supabase/migration-add-coupons.sql'
  }
  return null
}

/** 後台：全部優惠券範本 */
export async function fetchAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  return (data ?? []).map((row) =>
    normalizeCoupon(row as Record<string, unknown>)
  )
}

export async function createCoupon(data: CouponFormData): Promise<Coupon> {
  const { data: row, error } = await supabase
    .from('coupons')
    .insert(couponInsertPayload(data))
    .select('*')
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCoupon(row as Record<string, unknown>)
}

export async function updateCoupon(
  id: string,
  data: CouponFormData
): Promise<Coupon> {
  const { data: row, error } = await supabase
    .from('coupons')
    .update(couponInsertPayload(data))
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCoupon(row as Record<string, unknown>)
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) throw new Error(formatErrorMessage(error))
}

/** 後台：發放給單一會員 */
export async function issueCouponToMember(
  couponId: string,
  userId: string
): Promise<MemberCoupon> {
  const { data, error } = await supabase.rpc('admin_issue_coupon_to_member', {
    p_coupon_id: couponId,
    p_user_id: userId,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/admin_issue_coupon_to_member|function/i.test(msg)) {
      throw new Error(
        '發放優惠券功能未啟用，請執行 supabase/migration-add-coupons.sql'
      )
    }
    throw new Error(msg)
  }

  const row = Array.isArray(data) ? data[0] : data
  return normalizeMemberCoupon(row as Record<string, unknown>)
}

/** 後台：一鍵發放給全部會員 */
export async function issueCouponToAllMembers(
  couponId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('admin_issue_coupon_to_all', {
    p_coupon_id: couponId,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/admin_issue_coupon_to_all|function/i.test(msg)) {
      throw new Error(
        '一鍵發放功能未啟用，請執行 supabase/migration-add-coupons.sql'
      )
    }
    throw new Error(msg)
  }

  return typeof data === 'number' ? data : Number(data) || 0
}

/** 會員：可用優惠券（含範本） */
export async function fetchMemberAvailableCoupons(
  userId: string
): Promise<MemberCouponWithDefinition[]> {
  const { data, error } = await supabase
    .from('member_coupons')
    .select('*, coupons(*)')
    .eq('user_id', userId)
    .eq('status', 'available')
    .order('issued_at', { ascending: false })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    if (hint) return []
    throw new Error(formatErrorMessage(error))
  }

  const now = Date.now()
  return (data ?? [])
    .map((row) => {
      const mc = normalizeMemberCoupon(row as Record<string, unknown>)
      const couponRaw = (row as { coupons?: Record<string, unknown> }).coupons
      if (!couponRaw) return null
      const coupon = normalizeCoupon(couponRaw)
      if (!coupon.is_active) return null
      if (mc.expires_at && new Date(mc.expires_at).getTime() < now) return null
      return { ...mc, coupon }
    })
    .filter((x): x is MemberCouponWithDefinition => x != null)
}

/** 結帳成功後兌換優惠券 */
export async function redeemMemberCouponAtCheckout(
  memberCouponId: string,
  checkoutId: string,
  productSubtotal: number
): Promise<{ discountNtd: number; giftNote: string | null; couponTitle: string }> {
  const { data, error } = await supabase.rpc('redeem_member_coupon', {
    p_member_coupon_id: memberCouponId,
    p_checkout_id: checkoutId,
    p_product_subtotal: productSubtotal,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/redeem_member_coupon|function/i.test(msg)) {
      throw new Error(
        '優惠券兌換功能未啟用，請執行 supabase/migration-add-coupons.sql'
      )
    }
    throw new Error(msg)
  }

  const payload = (data ?? {}) as Record<string, unknown>
  return {
    discountNtd: Number(payload.discount_ntd) || 0,
    giftNote:
      payload.gift_note != null ? String(payload.gift_note) : null,
    couponTitle: String(payload.coupon_title ?? ''),
  }
}

/** 會員：優惠券紀錄（含已使用） */
export async function fetchMemberCouponHistory(
  userId: string,
  limit = 30
): Promise<MemberCouponWithDefinition[]> {
  const { data, error } = await supabase
    .from('member_coupons')
    .select('*, coupons(*)')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false })
    .limit(limit)

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    if (hint) return []
    throw new Error(formatErrorMessage(error))
  }

  return (data ?? [])
    .map((row) => {
      const mc = normalizeMemberCoupon(row as Record<string, unknown>)
      const couponRaw = (row as { coupons?: Record<string, unknown> }).coupons
      if (!couponRaw) return null
      return { ...mc, coupon: normalizeCoupon(couponRaw) }
    })
    .filter((x): x is MemberCouponWithDefinition => x != null)
}
