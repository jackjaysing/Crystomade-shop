import { formatErrorMessage } from '../formatError'
import { assertBrowserDisplayableImageFile, compressImageForUpload } from '../browserImage'
import { normalizeCrystalSoulCard } from '../grimoire'
import { supabase, PRODUCT_IMAGE_BUCKET, STORAGE_IMAGE_CACHE_CONTROL } from '../supabase'
import type { GrimoireTaskType } from '../../constants/grimoire'
import type { CrystalSoulCard } from '../types'

/** 會員：列出所有靈魂卡 */
export async function fetchMyCrystalSoulCards(userId: string): Promise<CrystalSoulCard[]> {
  const { data, error } = await supabase
    .from('crystal_soul_cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(formatErrorMessage(error))
  return (data ?? []).map((row) => normalizeCrystalSoulCard(row as Record<string, unknown>))
}

/** 會員：購入修為本數（下單人；含已轉贈出去的魔導書） */
export async function fetchPurchaseMeritCardCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('count_grimoire_purchase_merit_cards', {
    p_user_id: userId,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/count_grimoire_purchase_merit_cards|42883/i.test(msg)) {
      const { count, error: countError } = await supabase
        .from('crystal_soul_cards')
        .select('id', { count: 'exact', head: true })
        .eq('purchased_by_user_id', userId)

      if (countError) return 0
      return count ?? 0
    }
    throw new Error(msg)
  }

  return typeof data === 'number' ? data : Number(data) || 0
}

/** 會員：單張靈魂卡 */
export async function fetchMyCrystalSoulCard(
  userId: string,
  cardId: string
): Promise<CrystalSoulCard | null> {
  const { data, error } = await supabase
    .from('crystal_soul_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('id', cardId)
    .maybeSingle()

  if (error) throw new Error(formatErrorMessage(error))
  if (!data) return null
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

/** 公開頁：依 slug 唯讀查詢（需擁有者已開啟分享） */
export async function fetchPublicCrystalSoulCard(
  slug: string
): Promise<CrystalSoulCard | null> {
  const { data, error } = await supabase.rpc('get_public_crystal_soul_card', {
    p_slug: slug.trim(),
  })

  if (error) throw new Error(formatErrorMessage(error))
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return normalizeCrystalSoulCard(row as Record<string, unknown>)
}

/** 擁有者：開關分享 */
export async function setCrystalSoulCardPublic(
  cardId: string,
  isPublic: boolean
): Promise<CrystalSoulCard> {
  const { data, error } = await supabase.rpc('set_crystal_soul_card_public', {
    p_card_id: cardId,
    p_is_public: isPublic,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

/** 開發測試：一鍵升至極境 */
export async function devMaxUpgradeCrystalSoulCardRpc(
  cardId: string
): Promise<CrystalSoulCard> {
  const { data, error } = await supabase.rpc('dev_max_upgrade_crystal_soul_card', {
    p_card_id: cardId,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

/** 擁有者：簽署能量契約 */
export async function signCrystalEnergyContract(
  cardId: string,
  signerName?: string
): Promise<CrystalSoulCard> {
  const { data, error } = await supabase.rpc('sign_crystal_energy_contract', {
    p_card_id: cardId,
    p_signer_name: signerName ?? null,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

/** 擁有者：完成互動任務 */
export async function completeCrystalGrimoireTask(
  cardId: string,
  taskType: GrimoireTaskType
): Promise<CrystalSoulCard> {
  const { data, error } = await supabase.rpc('complete_crystal_grimoire_task', {
    p_card_id: cardId,
    p_task_type: taskType,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

/** 原持有人：產生贈送契約連結 */
export async function enableCrystalSoulCardGiftClaim(
  cardId: string
): Promise<CrystalSoulCard> {
  const { data, error } = await supabase.rpc('enable_crystal_soul_card_gift_claim', {
    p_card_id: cardId,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

export type GiftClaimPreview = Pick<
  CrystalSoulCard,
  | 'id'
  | 'serial_number'
  | 'product_name'
  | 'product_image_url'
  | 'selected_size'
  | 'magic_title'
  | 'element_primary'
  | 'magic_affiliation'
  | 'five_elements'
  | 'product_tags'
  | 'gift_claim_slug'
>

/** 贈送頁：預覽待簽契約的靈魂卡 */
export async function fetchGiftClaimCrystalSoulCard(
  slug: string
): Promise<GiftClaimPreview | null> {
  const { data, error } = await supabase.rpc('get_gift_claim_crystal_soul_card', {
    p_slug: slug.trim(),
  })

  if (error) throw new Error(formatErrorMessage(error))
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  const card = normalizeCrystalSoulCard(row as Record<string, unknown>)
  return card
}

/** 朋友：簽署契約並接手魔導書 */
export async function claimCrystalSoulCardGift(
  slug: string,
  signerName?: string
): Promise<CrystalSoulCard> {
  const { data, error } = await supabase.rpc('claim_crystal_soul_card_gift', {
    p_slug: slug.trim(),
    p_signer_name: signerName ?? null,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

export type ActivationClaimPreview = Pick<
  CrystalSoulCard,
  | 'id'
  | 'serial_number'
  | 'product_name'
  | 'product_image_url'
  | 'selected_size'
  | 'magic_title'
  | 'element_primary'
  | 'magic_affiliation'
  | 'five_elements'
  | 'product_tags'
  | 'activation_slug'
>

export type FulfillmentSoulCard = Pick<
  CrystalSoulCard,
  | 'id'
  | 'order_id'
  | 'serial_number'
  | 'activation_slug'
  | 'magic_title'
  | 'product_name'
  | 'selected_size'
  | 'contract_signed_at'
  | 'magic_birth_date'
  | 'element_primary'
  | 'magic_affiliation'
  | 'five_elements'
  | 'product_tags'
  | 'chakra'
  | 'resonance_keyword'
  | 'product_image_url'
>

/** 掃描 QR 頁：預覽待簽契約 */
export async function fetchActivationCrystalSoulCard(
  slug: string
): Promise<ActivationClaimPreview | null> {
  const { data, error } = await supabase.rpc('get_activation_crystal_soul_card', {
    p_slug: slug.trim(),
  })

  if (error) throw new Error(formatErrorMessage(error))
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return normalizeCrystalSoulCard(row as Record<string, unknown>) as ActivationClaimPreview
}

/** 購買人：掃描 QR 簽署契約 */
export async function signCrystalEnergyContractByActivation(
  slug: string,
  signerName?: string
): Promise<CrystalSoulCard> {
  const { data, error } = await supabase.rpc('sign_crystal_energy_contract_by_activation', {
    p_slug: slug.trim(),
    p_signer_name: signerName ?? null,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeCrystalSoulCard(data as Record<string, unknown>)
}

export type ActivationSoulCardRole = 'anonymous' | 'owner' | 'recipient' | 'invalid'

/** 掃描 QR 頁：目前登入者與此卡的關係 */
export async function fetchActivationCrystalSoulCardRole(
  slug: string
): Promise<ActivationSoulCardRole> {
  const { data, error } = await supabase.rpc('activation_crystal_soul_card_role', {
    p_slug: slug.trim(),
  })

  if (error) throw new Error(formatErrorMessage(error))
  const role = String(data ?? 'invalid')
  if (
    role === 'anonymous' ||
    role === 'owner' ||
    role === 'recipient' ||
    role === 'invalid'
  ) {
    return role
  }
  return 'invalid'
}

/** 後台出貨：查訂單對應靈魂卡 */
export async function fetchFulfillmentSoulCards(
  orderIds: string[]
): Promise<FulfillmentSoulCard[]> {
  if (orderIds.length === 0) return []

  const { data, error } = await supabase.rpc('get_fulfillment_soul_cards', {
    p_order_ids: orderIds,
  })

  if (error) throw new Error(formatErrorMessage(error))
  return (data ?? []).map((row: Record<string, unknown>) => {
    const r = row
    return {
      id: String(r.id ?? ''),
      order_id: String(r.order_id ?? ''),
      serial_number: String(r.serial_number ?? ''),
      activation_slug: r.activation_slug != null ? String(r.activation_slug) : null,
      magic_title: String(r.magic_title ?? ''),
      product_name: String(r.product_name ?? ''),
      selected_size: r.selected_size != null ? String(r.selected_size) : null,
      contract_signed_at:
        r.contract_signed_at != null ? String(r.contract_signed_at) : null,
      magic_birth_date:
        r.magic_birth_date != null ? String(r.magic_birth_date).slice(0, 10) : null,
      element_primary: String(r.element_primary ?? ''),
      magic_affiliation: String(r.magic_affiliation ?? ''),
      five_elements: Array.isArray(r.five_elements)
        ? r.five_elements.map(String)
        : [],
      product_tags: Array.isArray(r.product_tags) ? r.product_tags.map(String) : [],
      chakra: r.chakra != null ? String(r.chakra) : null,
      resonance_keyword:
        r.resonance_keyword != null ? String(r.resonance_keyword) : null,
      product_image_url:
        r.product_image_url != null ? String(r.product_image_url) : null,
    }
  })
}

/** 後台出貨：儲存魔法身分證出生日期 */
export async function setFulfillmentSoulCardBirthDate(
  cardId: string,
  birthDate: string | null
): Promise<void> {
  const { error } = await supabase.rpc('set_fulfillment_soul_card_birth_date', {
    p_card_id: cardId,
    p_birth_date: birthDate?.trim() ? birthDate.trim().slice(0, 10) : null,
  })

  if (error) throw new Error(formatErrorMessage(error))
}

export type FulfillmentSoulCardProfile = {
  element_primary: string
  magic_affiliation: string
  product_tags: string[]
  five_elements: string[]
  magic_title?: string
}

/** 後台出貨：儲存主屬性、魔法系別、功效類別（量身訂製可一併儲存手串名稱） */
export async function setFulfillmentSoulCardProfile(
  cardId: string,
  profile: Pick<
    FulfillmentSoulCardProfile,
    'element_primary' | 'magic_affiliation' | 'product_tags'
  > & { magic_title?: string }
): Promise<FulfillmentSoulCardProfile> {
  const { data, error } = await supabase.rpc('set_fulfillment_soul_card_profile', {
    p_card_id: cardId,
    p_element_primary: profile.element_primary.trim(),
    p_magic_affiliation: profile.magic_affiliation.trim(),
    p_product_tags: profile.product_tags,
    ...(profile.magic_title !== undefined
      ? { p_magic_title: profile.magic_title.trim() }
      : {}),
  })

  if (error) throw new Error(formatErrorMessage(error))
  const row = data as Record<string, unknown>
  return {
    element_primary: String(row.element_primary ?? ''),
    magic_affiliation: String(row.magic_affiliation ?? ''),
    product_tags: Array.isArray(row.product_tags) ? row.product_tags.map(String) : [],
    five_elements: Array.isArray(row.five_elements)
      ? row.five_elements.map(String)
      : [],
    magic_title: String(row.magic_title ?? ''),
  }
}

/** 後台出貨：上傳靈魂卡照片至 Storage */
export async function uploadFulfillmentSoulCardImage(
  cardId: string,
  file: File
): Promise<string> {
  assertBrowserDisplayableImageFile(file)
  const compressed = await compressImageForUpload(file, 'card')
  const ext = compressed.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `soul-cards/${cardId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, compressed, { cacheControl: STORAGE_IMAGE_CACHE_CONTROL, upsert: false })

  if (uploadError) throw new Error(formatErrorMessage(uploadError))

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** 後台出貨：儲存靈魂卡照片 URL */
export async function setFulfillmentSoulCardImage(
  cardId: string,
  imageUrl: string | null
): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_fulfillment_soul_card_image', {
    p_card_id: cardId,
    p_image_url: imageUrl?.trim() ? imageUrl.trim() : null,
  })

  if (error) throw new Error(formatErrorMessage(error))
  const row = data as Record<string, unknown>
  return row.product_image_url != null ? String(row.product_image_url) : null
}

/** 後台出貨：上傳並儲存靈魂卡照片 */
export async function replaceFulfillmentSoulCardImage(
  cardId: string,
  file: File
): Promise<string> {
  const imageUrl = await uploadFulfillmentSoulCardImage(cardId, file)
  const saved = await setFulfillmentSoulCardImage(cardId, imageUrl)
  return saved ?? imageUrl
}
