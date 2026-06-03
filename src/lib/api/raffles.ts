import { formatErrorMessage } from '../formatError'
import { supabase, PRODUCT_IMAGE_BUCKET } from '../supabase'
import type { Raffle, RaffleEntry, RaffleFormData, RaffleWithMeta } from '../types'

function normalizeRaffle(row: Record<string, unknown>): Raffle {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    registration_deadline: String(row.registration_deadline ?? ''),
    status: String(row.status) as Raffle['status'],
    is_active: Boolean(row.is_active),
    winner_user_id:
      row.winner_user_id != null ? String(row.winner_user_id) : null,
    drawn_at: row.drawn_at != null ? String(row.drawn_at) : null,
    prize_title: row.prize_title != null ? String(row.prize_title) : null,
    prize_image_url:
      row.prize_image_url != null ? String(row.prize_image_url) : null,
    prize_gift_description:
      row.prize_gift_description != null
        ? String(row.prize_gift_description)
        : null,
    prize_coupon_id:
      row.prize_coupon_id != null ? String(row.prize_coupon_id) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function migrationHint(msg: string): string | null {
  if (/raffles|raffle_entries|42P01|42703/i.test(msg)) {
    return '請在 Supabase SQL Editor 執行 supabase/migration-add-raffles.sql'
  }
  return null
}

function rafflePayload(data: RaffleFormData) {
  return {
    title: data.title.trim(),
    description: data.description.trim(),
    registration_deadline: data.registration_deadline,
    is_active: data.is_active,
    prize_title: data.prize_title.trim() || null,
    prize_image_url: data.prize_image_url,
    prize_gift_description: data.prize_gift_description.trim() || null,
    updated_at: new Date().toISOString(),
  }
}

export async function uploadRafflePrizeImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `raffle-prizes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(formatErrorMessage(error))
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function syncRafflePrizeCoupon(
  raffleId: string,
  data: RaffleFormData,
  existingCouponId: string | null
): Promise<string | null> {
  const prizeTitle = data.prize_title.trim()
  if (!prizeTitle) {
    if (existingCouponId) {
      await supabase.from('coupons').delete().eq('id', existingCouponId)
    }
    return null
  }

  const couponRow = {
    title: prizeTitle,
    description: `抽獎活動獎品：${data.title.trim()}`,
    coupon_type: 'gift' as const,
    min_purchase_amount: 0,
    discount_amount: null,
    discount_zhe: null,
    gift_description: data.prize_gift_description.trim() || prizeTitle,
    image_url: data.prize_image_url,
    redeem_mode: 'cart' as const,
    source_raffle_id: raffleId,
    is_active: true,
    valid_days: null,
    updated_at: new Date().toISOString(),
  }

  if (existingCouponId) {
    const { error } = await supabase
      .from('coupons')
      .update(couponRow)
      .eq('id', existingCouponId)
    if (error) throw new Error(formatErrorMessage(error))
    return existingCouponId
  }

  const { data: row, error } = await supabase
    .from('coupons')
    .insert(couponRow)
    .select('id')
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  return String((row as { id: string }).id)
}

async function finalizeOverdueRaffles(): Promise<void> {
  const { error } = await supabase.rpc('finalize_overdue_raffles')
  if (error && !/finalize_overdue_raffles|42883/i.test(formatErrorMessage(error))) {
    console.warn('finalize_overdue_raffles:', formatErrorMessage(error))
  }
}

async function attachRaffleMeta(
  rows: Raffle[],
  userId?: string | null
): Promise<RaffleWithMeta[]> {
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const { data: entries, error } = await supabase
    .from('raffle_entries')
    .select('raffle_id, user_id')
    .in('raffle_id', ids)

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  const countByRaffle = new Map<string, number>()
  const userEntered = new Set<string>()
  for (const e of entries ?? []) {
    const rid = String((e as { raffle_id: string }).raffle_id)
    countByRaffle.set(rid, (countByRaffle.get(rid) ?? 0) + 1)
    if (userId && String((e as { user_id: string }).user_id) === userId) {
      userEntered.add(rid)
    }
  }

  const winnerIds = [
    ...new Set(
      rows.map((r) => r.winner_user_id).filter((id): id is string => Boolean(id))
    ),
  ]
  const winnerNames = new Map<string, string>()
  if (winnerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('member_profiles')
      .select('id, real_name')
      .in('id', winnerIds)
    for (const p of profiles ?? []) {
      winnerNames.set(String((p as { id: string }).id), String((p as { real_name: string }).real_name))
    }
  }

  return rows.map((r) => ({
    ...r,
    entry_count: countByRaffle.get(r.id) ?? 0,
    user_entered: userEntered.has(r.id),
    user_is_winner: Boolean(userId && r.winner_user_id === userId),
    winner_name: r.winner_user_id
      ? winnerNames.get(r.winner_user_id) ?? null
      : null,
  }))
}

/** 前台：進行中與近期抽獎（截止後自動開獎） */
export async function fetchPublicRaffles(
  userId?: string | null
): Promise<RaffleWithMeta[]> {
  await finalizeOverdueRaffles()

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('is_active', true)
    .neq('status', 'cancelled')
    .order('registration_deadline', { ascending: false })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  const rows = (data ?? []).map((row) =>
    normalizeRaffle(row as Record<string, unknown>)
  )
  return attachRaffleMeta(rows, userId)
}

/** 後台：全部抽獎 */
export async function fetchAllRaffles(): Promise<RaffleWithMeta[]> {
  await finalizeOverdueRaffles()

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  const rows = (data ?? []).map((row) =>
    normalizeRaffle(row as Record<string, unknown>)
  )
  return attachRaffleMeta(rows)
}

export async function createRaffle(data: RaffleFormData): Promise<Raffle> {
  const { data: row, error } = await supabase
    .from('raffles')
    .insert({
      ...rafflePayload(data),
      status: 'open',
    })
    .select('*')
    .single()

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  const raffle = normalizeRaffle(row as Record<string, unknown>)
  const couponId = await syncRafflePrizeCoupon(raffle.id, data, null)
  if (couponId) {
    const { data: updated, error: updErr } = await supabase
      .from('raffles')
      .update({ prize_coupon_id: couponId, updated_at: new Date().toISOString() })
      .eq('id', raffle.id)
      .select('*')
      .single()
    if (updErr) throw new Error(formatErrorMessage(updErr))
    return normalizeRaffle(updated as Record<string, unknown>)
  }

  return raffle
}

export async function updateRaffle(
  id: string,
  data: RaffleFormData,
  existingCouponId?: string | null
): Promise<Raffle> {
  const couponId = await syncRafflePrizeCoupon(
    id,
    data,
    existingCouponId ?? null
  )

  const { data: row, error } = await supabase
    .from('raffles')
    .update({
      ...rafflePayload(data),
      prize_coupon_id: couponId,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  return normalizeRaffle(row as Record<string, unknown>)
}

export async function deleteRaffle(id: string): Promise<void> {
  const { error } = await supabase.from('raffles').delete().eq('id', id)
  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }
}

/** 會員報名 */
export async function registerForRaffle(
  raffleId: string,
  userId: string
): Promise<RaffleEntry> {
  const { data, error } = await supabase.rpc('register_for_raffle', {
    p_raffle_id: raffleId,
    p_user_id: userId,
  })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  const row = data as Record<string, unknown>
  return {
    id: String(row.id ?? ''),
    raffle_id: String(row.raffle_id ?? ''),
    user_id: String(row.user_id ?? ''),
    entered_at: String(row.entered_at ?? ''),
  }
}

/** 後台：手動觸發開獎（截止後） */
export async function drawRaffleWinner(raffleId: string): Promise<Raffle> {
  const { data, error } = await supabase.rpc('finalize_raffle_draw', {
    p_raffle_id: raffleId,
  })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  return normalizeRaffle(data as Record<string, unknown>)
}

/** 後台：報名名單 */
export async function fetchRaffleEntries(raffleId: string): Promise<
  Array<RaffleEntry & { real_name: string; phone: string }>
> {
  const { data, error } = await supabase
    .from('raffle_entries')
    .select('*, member_profiles(real_name, phone)')
    .eq('raffle_id', raffleId)
    .order('entered_at', { ascending: true })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>
    const profile = raw.member_profiles as Record<string, unknown> | null
    return {
      id: String(raw.id ?? ''),
      raffle_id: String(raw.raffle_id ?? ''),
      user_id: String(raw.user_id ?? ''),
      entered_at: String(raw.entered_at ?? ''),
      real_name: String(profile?.real_name ?? ''),
      phone: String(profile?.phone ?? ''),
    }
  })
}
