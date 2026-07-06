import { FIVE_ELEMENTS, type FiveElement } from '../constants/fiveElements'
import type { CrystalMagicStatus } from '../constants/grimoire'
import type { CrystalSoulCard } from './types'

function parseFiveElements(values: unknown): FiveElement[] {
  if (!Array.isArray(values)) return []
  const valid = new Set<string>(FIVE_ELEMENTS)
  return values.filter((v): v is FiveElement => typeof v === 'string' && valid.has(v))
}

function parseMagicStatus(value: unknown): CrystalMagicStatus {
  if (
    value === 'starlight' ||
    value === 'awakening' ||
    value === 'resonating' ||
    value === 'ascendant'
  ) {
    return value
  }
  return 'dormant'
}

/** 將 Supabase 列整理為 CrystalSoulCard */
export function normalizeCrystalSoulCard(row: Record<string, unknown>): CrystalSoulCard {
  return {
    id: String(row.id ?? ''),
    order_id: String(row.order_id ?? ''),
    user_id: String(row.user_id ?? ''),
    purchased_by_user_id:
      row.purchased_by_user_id != null ? String(row.purchased_by_user_id) : null,
    product_id: row.product_id != null ? String(row.product_id) : null,
    serial_number: String(row.serial_number ?? ''),
    public_slug: String(row.public_slug ?? ''),
    product_name: String(row.product_name ?? ''),
    product_image_url:
      row.product_image_url != null ? String(row.product_image_url) : null,
    selected_size: row.selected_size != null ? String(row.selected_size) : null,
    product_category:
      row.product_category != null ? String(row.product_category) : null,
    product_tags: Array.isArray(row.product_tags)
      ? row.product_tags.map(String)
      : [],
    five_elements: parseFiveElements(row.five_elements),
    element_primary: String(row.element_primary ?? '土'),
    magic_title: String(row.magic_title ?? ''),
    magic_affiliation: String(row.magic_affiliation ?? ''),
    chakra: row.chakra != null ? String(row.chakra) : null,
    resonance_keyword:
      row.resonance_keyword != null ? String(row.resonance_keyword) : null,
    awakening_verse:
      row.awakening_verse != null ? String(row.awakening_verse) : null,
    magic_status: parseMagicStatus(row.magic_status),
    awakened_at: row.awakened_at != null ? String(row.awakened_at) : null,
    grimoire_task_count:
      typeof row.grimoire_task_count === 'number'
        ? row.grimoire_task_count
        : Number(row.grimoire_task_count) || 0,
    is_public: Boolean(row.is_public),
    energy_level:
      typeof row.energy_level === 'number'
        ? row.energy_level
        : Number(row.energy_level) || 60,
    contract_signed_at:
      row.contract_signed_at != null ? String(row.contract_signed_at) : null,
    contract_signer_name:
      row.contract_signer_name != null ? String(row.contract_signer_name) : null,
    last_purify_at:
      row.last_purify_at != null ? String(row.last_purify_at) : null,
    last_moon_charge_at:
      row.last_moon_charge_at != null ? String(row.last_moon_charge_at) : null,
    last_meditation_at:
      row.last_meditation_at != null ? String(row.last_meditation_at) : null,
    gift_claim_slug:
      row.gift_claim_slug != null ? String(row.gift_claim_slug) : null,
    activation_slug:
      row.activation_slug != null ? String(row.activation_slug) : null,
    gifted_from_user_id:
      row.gifted_from_user_id != null ? String(row.gifted_from_user_id) : null,
    gifted_at: row.gifted_at != null ? String(row.gifted_at) : null,
    magic_birth_date:
      row.magic_birth_date != null ? String(row.magic_birth_date).slice(0, 10) : null,
    created_at: String(row.created_at ?? ''),
  }
}

/** 後台 RPC：僅修為相關欄位的靈魂卡快照 */
export function normalizeMagicianSoulCardSnapshot(
  row: Record<string, unknown>
): CrystalSoulCard {
  return {
    ...normalizeCrystalSoulCard({
      ...row,
      order_id: '',
      serial_number: '',
      public_slug: '',
      product_name: '',
      product_id: null,
      product_image_url: null,
      selected_size: null,
      product_category: null,
      product_tags: [],
      five_elements: [],
      element_primary: '土',
      magic_title: '',
      magic_affiliation: '',
      chakra: null,
      resonance_keyword: null,
      awakening_verse: null,
      awakened_at: null,
      grimoire_task_count: 0,
      contract_signer_name: null,
      gift_claim_slug: null,
      activation_slug: null,
      gifted_from_user_id: null,
      gifted_at: null,
      magic_birth_date: null,
    }),
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    purchased_by_user_id:
      row.purchased_by_user_id != null ? String(row.purchased_by_user_id) : null,
    contract_signed_at:
      row.contract_signed_at != null ? String(row.contract_signed_at) : null,
    magic_status: parseMagicStatus(row.magic_status),
    energy_level:
      typeof row.energy_level === 'number'
        ? row.energy_level
        : Number(row.energy_level) || 60,
    is_public: Boolean(row.is_public),
    last_purify_at:
      row.last_purify_at != null ? String(row.last_purify_at) : null,
    last_moon_charge_at:
      row.last_moon_charge_at != null ? String(row.last_moon_charge_at) : null,
    last_meditation_at:
      row.last_meditation_at != null ? String(row.last_meditation_at) : null,
    created_at: String(row.created_at ?? ''),
  }
}

export function crystalSoulCardGiftClaimUrl(slug: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/grimoire/gift/${slug}`
  }
  return `/grimoire/gift/${slug}`
}

export function crystalSoulCardPublicUrl(slug: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/grimoire/${slug}`
  }
  return `/grimoire/${slug}`
}

export function crystalSoulCardActivationUrl(slug: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/grimoire/sign/${slug}`
  }
  return `/grimoire/sign/${slug}`
}
