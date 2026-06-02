import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET } from '../supabase'
import type { AnnouncementBanner } from '../types'

function normalizeBanner(row: Record<string, unknown>): AnnouncementBanner {
  return {
    id: String(row.id),
    name: row.name != null ? String(row.name) : '',
    image_url: String(row.image_url),
    link_url: row.link_url != null ? String(row.link_url) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active ?? true),
    created_at: String(row.created_at),
  }
}

async function uploadBannerImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function getNextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('announcement_banners')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) throw new Error(formatErrorMessage(error))
  const max = data?.[0]?.sort_order
  return typeof max === 'number' ? max + 1 : 0
}

/** 前台：取得啟用中的公告橫幅 */
export async function fetchActiveBanners(): Promise<AnnouncementBanner[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('announcement_banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    if (/announcement_banners|42P01|42703/i.test(formatErrorMessage(error))) {
      return []
    }
    throw new Error(formatErrorMessage(error))
  }

  return (data ?? []).map((row) =>
    normalizeBanner(row as Record<string, unknown>)
  )
}

/** 後台：取得所有公告橫幅 */
export async function fetchAllBanners(): Promise<AnnouncementBanner[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('announcement_banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new Error(formatErrorMessage(error))

  return (data ?? []).map((row) =>
    normalizeBanner(row as Record<string, unknown>)
  )
}

/** 後台：上傳並新增公告橫幅 */
export async function createBanner(
  file: File,
  options: { name: string; linkUrl?: string }
): Promise<AnnouncementBanner> {
  const trimmedName = options.name.trim()
  if (!trimmedName) {
    throw new Error('請填寫橫幅名稱')
  }

  const image_url = await uploadBannerImage(file)
  const sort_order = await getNextSortOrder()
  const trimmedLink = options.linkUrl?.trim()

  const { data, error } = await supabase
    .from('announcement_banners')
    .insert({
      name: trimmedName,
      image_url,
      link_url: trimmedLink || null,
      sort_order,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  const banner = normalizeBanner(data as Record<string, unknown>)
  void recordAdminActivity({
    action: 'create',
    entityType: 'banner',
    entityId: banner.id,
    entityLabel: banner.name,
    summary: `新增公告橫幅「${banner.name}」`,
  })
  return banner
}

/** 後台：更新橫幅名稱、連結、圖片或啟用狀態 */
export async function updateBanner(
  id: string,
  patch: {
    name?: string
    link_url?: string | null
    is_active?: boolean
    imageFile?: File | null
  }
): Promise<AnnouncementBanner> {
  const payload: Record<string, unknown> = {}

  if ('name' in patch) {
    const trimmed = patch.name?.trim()
    if (!trimmed) throw new Error('請填寫橫幅名稱')
    payload.name = trimmed
  }
  if ('link_url' in patch) {
    const trimmed = patch.link_url?.trim()
    payload.link_url = trimmed || null
  }
  if ('is_active' in patch) {
    payload.is_active = patch.is_active
  }
  if (patch.imageFile) {
    payload.image_url = await uploadBannerImage(patch.imageFile)
  }

  const { data, error } = await supabase
    .from('announcement_banners')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  const banner = normalizeBanner(data as Record<string, unknown>)
  void recordAdminActivity({
    action: 'update',
    entityType: 'banner',
    entityId: banner.id,
    entityLabel: banner.name,
    summary: `修改公告橫幅「${banner.name}」`,
  })
  return banner
}

/** 後台：調整橫幅排序 */
export async function swapBannerOrder(
  bannerId: string,
  direction: 'up' | 'down',
  banners: AnnouncementBanner[]
): Promise<void> {
  const index = banners.findIndex((b) => b.id === bannerId)
  if (index < 0) return

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= banners.length) return

  const current = banners[index]
  const target = banners[swapIndex]

  const { error: errorA } = await supabase
    .from('announcement_banners')
    .update({ sort_order: target.sort_order })
    .eq('id', current.id)

  if (errorA) throw new Error(formatErrorMessage(errorA))

  const { error: errorB } = await supabase
    .from('announcement_banners')
    .update({ sort_order: current.sort_order })
    .eq('id', target.id)

  if (errorB) throw new Error(formatErrorMessage(errorB))

  const dirLabel = direction === 'up' ? '上移' : '下移'
  void recordAdminActivity({
    action: 'sort',
    entityType: 'banner',
    entityId: current.id,
    entityLabel: current.name,
    summary: `調整橫幅排序：「${current.name}」${dirLabel}`,
  })
}

/** 後台：刪除公告橫幅 */
export async function deleteBanner(id: string): Promise<void> {
  const { data: row } = await supabase
    .from('announcement_banners')
    .select('name')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('announcement_banners')
    .delete()
    .eq('id', id)

  if (error) throw new Error(formatErrorMessage(error))

  const name = row?.name ? String(row.name) : id
  void recordAdminActivity({
    action: 'delete',
    entityType: 'banner',
    entityId: id,
    entityLabel: name,
    summary: `刪除公告橫幅「${name}」`,
  })
}
