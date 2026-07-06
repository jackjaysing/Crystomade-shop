import { formatErrorMessage } from '../formatError'
import { normalizeMagicianSoulCardSnapshot } from '../grimoire'
import { supabase } from '../supabase'
import type { CrystalSoulCard } from '../types'

const ADMIN_SOUL_CARD_SELECT =
  'id, user_id, purchased_by_user_id, contract_signed_at, magic_status, energy_level, is_public, last_purify_at, last_moon_charge_at, last_meditation_at, created_at'

function rpcRowHasPurchaseBy(row: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(row, 'purchased_by_user_id')
}

async function fetchAdminCrystalSoulCardsFromTable(): Promise<CrystalSoulCard[]> {
  const { data, error } = await supabase
    .from('crystal_soul_cards')
    .select(ADMIN_SOUL_CARD_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    if (/crystal_soul_cards|42P01/i.test(formatErrorMessage(error))) {
      return []
    }
    throw new Error(formatErrorMessage(error))
  }

  return (data ?? []).map((row) =>
    normalizeMagicianSoulCardSnapshot(row as Record<string, unknown>)
  )
}

/** 後台：列出靈魂卡修為快照（供魔法師等級計算） */
export async function fetchAdminCrystalSoulCards(): Promise<CrystalSoulCard[]> {
  const { data, error } = await supabase.rpc('admin_fetch_magician_soul_cards')

  if (error) {
    const msg = formatErrorMessage(error)
    if (/admin_fetch_magician_soul_cards|42883/i.test(msg)) {
      return fetchAdminCrystalSoulCardsFromTable()
    }
    throw new Error(msg)
  }

  const rawRows = (Array.isArray(data) ? data : data ? [data] : []) as Record<
    string,
    unknown
  >[]

  if (
    rawRows.length > 0 &&
    !rawRows.some((row) => rpcRowHasPurchaseBy(row))
  ) {
    return fetchAdminCrystalSoulCardsFromTable()
  }

  return rawRows.map((row) => normalizeMagicianSoulCardSnapshot(row))
}

/** 後台：各會員購入修為本數（下單人） */
export async function fetchAdminPurchaseMeritCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('admin_fetch_purchase_merit_counts')

  if (error) {
    const msg = formatErrorMessage(error)
    if (/admin_fetch_purchase_merit_counts|42883/i.test(msg)) {
      return new Map()
    }
    throw new Error(msg)
  }

  const rows = Array.isArray(data) ? data : data ? [data] : []
  const counts = new Map<string, number>()
  for (const row of rows) {
    const record = row as Record<string, unknown>
    const userId = record.user_id != null ? String(record.user_id) : ''
    if (!userId) continue
    counts.set(
      userId,
      typeof record.card_count === 'number'
        ? record.card_count
        : Number(record.card_count) || 0
    )
  }
  return counts
}

export interface AdminLegacyGrimoireIssueInput {
  userId: string
  productId?: string | null
  productName: string
  productImageUrl?: string | null
  selectedSize?: string | null
  quantity: number
  note?: string
}

export interface AdminLegacyGrimoireIssueRow {
  orderId: string
  soulCardId: string | null
  serialNumber: string | null
  activationSlug: string | null
}

/** 後台：補登歷史購買（無官網訂單）並發行魔導書 */
export async function adminIssueLegacyGrimoireOrders(
  input: AdminLegacyGrimoireIssueInput
): Promise<AdminLegacyGrimoireIssueRow[]> {
  const { data, error } = await supabase.rpc('admin_issue_legacy_grimoire_orders', {
    p_user_id: input.userId,
    p_product_id: input.productId ?? null,
    p_product_name: input.productName.trim() || '水晶（線下購入）',
    p_product_image_url: input.productImageUrl?.trim() || null,
    p_selected_size: input.selectedSize?.trim() || null,
    p_quantity: Math.max(1, Math.min(20, Math.floor(input.quantity) || 1)),
    p_note: input.note?.trim() || null,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/admin_issue_legacy_grimoire_orders|42883|schema cache/i.test(msg)) {
      throw new Error(
        '後台補登魔導書尚未啟用：請至 Supabase → SQL Editor 執行 supabase/migration-grimoire-admin-legacy-order.sql（需先跑 migration-grimoire-issue-on-shipped.sql），完成後重新整理後台再試'
      )
    }
    throw new Error(msg)
  }

  const rows = Array.isArray(data) ? data : data ? [data] : []
  return rows.map((row) => {
    const record = row as Record<string, unknown>
    return {
      orderId: String(record.order_id ?? ''),
      soulCardId: record.soul_card_id != null ? String(record.soul_card_id) : null,
      serialNumber:
        record.serial_number != null ? String(record.serial_number) : null,
      activationSlug:
        record.activation_slug != null ? String(record.activation_slug) : null,
    }
  })
}
