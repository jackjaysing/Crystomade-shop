import { compressImageForUpload } from '../browserImage'
import {
  RAFFLE_GIFT_DESCRIPTION,
  RAFFLE_GIFT_VALID_DAYS,
} from '../../constants/raffles'
import { buildRaffleUpdateSummary } from '../adminChangeSummary'
import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { buildRaffleListedCodes, raffleDayKey } from '../raffleListedCode'
import { supabase, PRODUCT_IMAGE_BUCKET, STORAGE_IMAGE_CACHE_CONTROL } from '../supabase'
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
    prize_title:
      row.prize_title != null && String(row.prize_title).trim() !== ''
        ? String(row.prize_title)
        : null,
    prize_image_url:
      row.prize_image_url != null && String(row.prize_image_url).trim() !== ''
        ? String(row.prize_image_url)
        : null,
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
  const prizeTitle = data.prize_title.trim()
  return {
    title: prizeTitle,
    description: data.description.trim(),
    registration_deadline: data.registration_deadline,
    is_active: data.is_active,
    prize_title: prizeTitle || null,
    prize_image_url: data.prize_image_url,
    prize_gift_description: RAFFLE_GIFT_DESCRIPTION,
    updated_at: new Date().toISOString(),
  }
}

export async function uploadRafflePrizeImage(file: File): Promise<string> {
  const compressed = await compressImageForUpload(file, 'card')
  const ext = compressed.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `raffle-prizes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, compressed, { cacheControl: STORAGE_IMAGE_CACHE_CONTROL, upsert: false })

  if (error) throw new Error(formatErrorMessage(error))
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function syncRafflePrizeCoupon(
  raffleId: string,
  data: RaffleFormData,
  existingCouponId: string | null
): Promise<string> {
  const prizeTitle = data.prize_title.trim()
  if (!prizeTitle) {
    throw new Error('請填寫禮物名稱')
  }

  const couponRow = {
    title: prizeTitle,
    description: `抽獎活動獎品：${prizeTitle}`,
    coupon_type: 'gift' as const,
    min_purchase_amount: 0,
    discount_amount: null,
    discount_zhe: null,
    gift_description: RAFFLE_GIFT_DESCRIPTION,
    image_url: data.prize_image_url,
    redeem_mode: 'cart' as const,
    source_raffle_id: raffleId,
    is_active: true,
    valid_days: RAFFLE_GIFT_VALID_DAYS,
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

/** 抽獎獎品圖／名稱以禮物券為準；補齊僅存在於 coupons 的舊資料 */
async function enrichRafflePrizesFromCoupons(rows: Raffle[]): Promise<Raffle[]> {
  if (rows.length === 0) return rows

  const couponIds = [
    ...new Set(
      rows
        .map((r) => r.prize_coupon_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const raffleIds = rows.map((r) => r.id)

  const orFilters: string[] = []
  if (couponIds.length > 0) {
    orFilters.push(`id.in.(${couponIds.join(',')})`)
  }
  if (raffleIds.length > 0) {
    orFilters.push(`source_raffle_id.in.(${raffleIds.join(',')})`)
  }
  if (orFilters.length === 0) return rows

  const { data, error } = await supabase
    .from('coupons')
    .select('id, title, image_url, source_raffle_id')
    .or(orFilters.join(','))

  if (error) {
    console.warn('[晶刻] 讀取抽獎禮物券失敗:', formatErrorMessage(error))
    return rows
  }

  const couponById = new Map<string, Record<string, unknown>>()
  const couponByRaffleId = new Map<string, Record<string, unknown>>()
  for (const row of data ?? []) {
    const raw = row as Record<string, unknown>
    couponById.set(String(raw.id), raw)
    if (raw.source_raffle_id != null) {
      couponByRaffleId.set(String(raw.source_raffle_id), raw)
    }
  }

  return rows.map((r) => {
    const coupon = r.prize_coupon_id
      ? couponById.get(r.prize_coupon_id)
      : couponByRaffleId.get(r.id)
    if (!coupon) return r

    const couponTitle =
      coupon.title != null && String(coupon.title).trim() !== ''
        ? String(coupon.title)
        : null
    const couponImage =
      coupon.image_url != null && String(coupon.image_url).trim() !== ''
        ? String(coupon.image_url)
        : null

    return {
      ...r,
      prize_title: r.prize_title ?? couponTitle,
      prize_image_url: r.prize_image_url ?? couponImage,
    }
  })
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

  const listedCodes = await fetchListedCodeMap()

  return rows.map((r) => ({
    ...r,
    entry_count: countByRaffle.get(r.id) ?? 0,
    user_entered: userEntered.has(r.id),
    user_is_winner: Boolean(userId && r.winner_user_id === userId),
    winner_name: r.winner_user_id
      ? winnerNames.get(r.winner_user_id) ?? null
      : null,
    listed_code:
      listedCodes.get(r.id) ?? `${raffleDayKey(r.created_at)}-01`,
  }))
}

async function fetchListedCodeMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('raffles').select('id, created_at')

  if (error) {
    console.warn('[晶刻] 讀取抽獎上架編號失敗:', formatErrorMessage(error))
    return new Map()
  }

  return buildRaffleListedCodes(
    (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      created_at: String((row as { created_at: string }).created_at),
    }))
  )
}

/** 前台：進行中與近期抽獎（截止後自動開獎） */
export async function fetchPublicRaffles(
  userId?: string | null,
  options?: { skipFinalize?: boolean }
): Promise<RaffleWithMeta[]> {
  if (!options?.skipFinalize) {
    await finalizeOverdueRaffles()
  }

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('is_active', true)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  const rows = (data ?? []).map((row) =>
    normalizeRaffle(row as Record<string, unknown>)
  )
  const enriched = await enrichRafflePrizesFromCoupons(rows)
  return attachRaffleMeta(enriched, userId)
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
  const enriched = await enrichRafflePrizesFromCoupons(rows)
  return attachRaffleMeta(enriched)
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
  const { data: updated, error: updErr } = await supabase
    .from('raffles')
    .update({ prize_coupon_id: couponId, updated_at: new Date().toISOString() })
    .eq('id', raffle.id)
    .select('*')
    .single()
  if (updErr) throw new Error(formatErrorMessage(updErr))
  const created = normalizeRaffle(updated as Record<string, unknown>)
  const prizeName = created.prize_title?.trim() || created.title.trim() || created.id
  void recordAdminActivity({
    action: 'create',
    entityType: 'raffle',
    entityId: created.id,
    entityLabel: prizeName,
    summary: `新增抽獎「${prizeName}」`,
  })
  return created
}

export async function updateRaffle(
  id: string,
  data: RaffleFormData,
  existingCouponId?: string | null
): Promise<Raffle> {
  const { data: beforeRow, error: beforeError } = await supabase
    .from('raffles')
    .select('*')
    .eq('id', id)
    .single()

  if (beforeError || !beforeRow) {
    throw new Error(beforeError ? formatErrorMessage(beforeError) : '找不到抽獎活動')
  }

  const beforeRaffle = normalizeRaffle(beforeRow as Record<string, unknown>)

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

  const updated = normalizeRaffle(row as Record<string, unknown>)
  const prizeName = updated.prize_title?.trim() || updated.title.trim() || updated.id
  void recordAdminActivity({
    action: 'update',
    entityType: 'raffle',
    entityId: updated.id,
    entityLabel: prizeName,
    summary: buildRaffleUpdateSummary(beforeRaffle, data),
  })
  return updated
}

export async function deleteRaffle(id: string): Promise<void> {
  const { data: row } = await supabase
    .from('raffles')
    .select('title, prize_title')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('raffles').delete().eq('id', id)
  if (error) {
    const hint = migrationHint(formatErrorMessage(error))
    throw new Error(hint ?? formatErrorMessage(error))
  }

  const prizeName =
    (row?.prize_title && String(row.prize_title).trim()) ||
    (row?.title && String(row.title).trim()) ||
    id
  void recordAdminActivity({
    action: 'delete',
    entityType: 'raffle',
    entityId: id,
    entityLabel: prizeName,
    summary: `刪除抽獎「${prizeName}」`,
  })
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

  const drawn = normalizeRaffle(data as Record<string, unknown>)
  const prizeName = drawn.prize_title?.trim() || drawn.title.trim() || drawn.id
  void recordAdminActivity({
    action: 'status',
    entityType: 'raffle',
    entityId: drawn.id,
    entityLabel: prizeName,
    summary: `抽獎開獎「${prizeName}」`,
  })
  return drawn
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
