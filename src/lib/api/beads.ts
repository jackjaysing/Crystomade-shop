import { pickEfficacyTags } from '../efficacyTags'
import { formatErrorMessage } from '../formatError'
import { compressImageForUpload } from '../browserImage'
import { sanitizeFiveElements } from '../fiveElements'
import {
  defaultBeadSizes,
  sanitizeBeadSizes,
  type BeadSizeCategory,
} from '../../constants/beadSizes'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET, STORAGE_IMAGE_CACHE_CONTROL } from '../supabase'
import type { FiveElement } from '../../constants/fiveElements'

export interface BraceletBead {
  id: string
  name: string
  elements: FiveElement[]
  sizes: BeadSizeCategory[]
  efficacy_tags: string[]
  image_url: string
  sort_order: number
  is_active: boolean
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface BraceletBeadFormData {
  name: string
  elements: FiveElement[]
  sizes: BeadSizeCategory[]
  efficacy_tags: string[]
  is_active: boolean
  admin_notes?: string | null
  imageFile?: File | null
  image_url?: string
}

function normalizeBead(row: Record<string, unknown>): BraceletBead {
  let elements = sanitizeFiveElements(
    Array.isArray(row.elements) ? row.elements.map(String) : []
  )
  // 相容尚未跑 multi-elements migration 的舊列
  if (elements.length === 0 && row.element != null) {
    elements = sanitizeFiveElements([String(row.element)])
  }
  if (elements.length === 0) elements = ['土']

  const sizes = defaultBeadSizes(
    Array.isArray(row.sizes) ? sanitizeBeadSizes(row.sizes.map(String)) : []
  )

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    elements,
    sizes,
    efficacy_tags: pickEfficacyTags(
      Array.isArray(row.efficacy_tags) ? row.efficacy_tags.map(String) : []
    ),
    image_url: String(row.image_url ?? ''),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active ?? true),
    admin_notes: row.admin_notes != null ? String(row.admin_notes) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

async function uploadBeadImage(file: File): Promise<string> {
  const compressed = await compressImageForUpload(file, 'card')
  const ext = compressed.name.split('.').pop() ?? 'jpg'
  const path = `bracelet-beads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, compressed, { cacheControl: STORAGE_IMAGE_CACHE_CONTROL, upsert: false })

  if (error) throw error
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function throwBeadsMigrationHint(msg: string): never {
  if (/bracelet_beads|42P01/i.test(msg)) {
    throw new Error(
      '資料庫尚未啟用珠材表，請在 Supabase SQL Editor 執行 supabase/migration-bracelet-configurator.sql'
    )
  }
  if (/column .*sizes|sizes/i.test(msg)) {
    throw new Error(
      '珠材咪數欄位未就緒：請在 Supabase SQL Editor 執行 supabase/migration-bracelet-bead-sizes.sql'
    )
  }
  if (/column .*elements|elements/i.test(msg)) {
    throw new Error(
      '珠材多五行欄位未就緒：請在 Supabase SQL Editor 執行 supabase/migration-bracelet-bead-multi-elements.sql'
    )
  }
  throw new Error(msg)
}

async function nextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('bracelet_beads')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  if (error) throwBeadsMigrationHint(formatErrorMessage(error))
  const max = data?.[0]?.sort_order
  return typeof max === 'number' ? max + 1 : 0
}

/** 前台：上架珠材 */
export async function fetchActiveBraceletBeads(): Promise<BraceletBead[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('bracelet_beads')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    if (/bracelet_beads|42P01/i.test(formatErrorMessage(error))) return []
    throw new Error(formatErrorMessage(error))
  }

  return (data ?? []).map((row) => normalizeBead(row as Record<string, unknown>))
}

/** 後台：全部珠材 */
export async function fetchAllBraceletBeads(): Promise<BraceletBead[]> {
  const { data, error } = await supabase
    .from('bracelet_beads')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throwBeadsMigrationHint(formatErrorMessage(error))
  return (data ?? []).map((row) => normalizeBead(row as Record<string, unknown>))
}

export async function createBraceletBead(form: BraceletBeadFormData): Promise<BraceletBead> {
  const name = form.name.trim()
  if (!name) throw new Error('請填寫珠材名稱')
  const elements = sanitizeFiveElements(form.elements)
  if (elements.length === 0) throw new Error('請至少選擇一個五行')
  const sizes = sanitizeBeadSizes(form.sizes)
  if (sizes.length === 0) throw new Error('請至少選擇一個咪數區間')
  if (!form.imageFile && !form.image_url?.trim()) throw new Error('請上傳珠材圖片')

  const imageUrl = form.imageFile
    ? await uploadBeadImage(form.imageFile)
    : String(form.image_url ?? '').trim()

  const sortOrder = await nextSortOrder()
  const { data, error } = await supabase
    .from('bracelet_beads')
    .insert({
      name,
      elements,
      sizes,
      efficacy_tags: pickEfficacyTags(form.efficacy_tags),
      image_url: imageUrl,
      sort_order: sortOrder,
      is_active: form.is_active,
      admin_notes: form.admin_notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throwBeadsMigrationHint(formatErrorMessage(error))
  return normalizeBead(data as Record<string, unknown>)
}

export async function updateBraceletBead(
  id: string,
  patch: Partial<BraceletBeadFormData> & { sort_order?: number }
): Promise<BraceletBead> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name != null) {
    const name = patch.name.trim()
    if (!name) throw new Error('請填寫珠材名稱')
    updates.name = name
  }
  if (patch.elements != null) {
    const elements = sanitizeFiveElements(patch.elements)
    if (elements.length === 0) throw new Error('請至少選擇一個五行')
    updates.elements = elements
  }
  if (patch.sizes != null) {
    const sizes = sanitizeBeadSizes(patch.sizes)
    if (sizes.length === 0) throw new Error('請至少選擇一個咪數區間')
    updates.sizes = sizes
  }
  if (patch.efficacy_tags != null) updates.efficacy_tags = pickEfficacyTags(patch.efficacy_tags)
  if (patch.is_active != null) updates.is_active = patch.is_active
  if (patch.admin_notes !== undefined) {
    updates.admin_notes = patch.admin_notes?.trim() || null
  }
  if (patch.sort_order != null) updates.sort_order = patch.sort_order
  if (patch.imageFile) {
    updates.image_url = await uploadBeadImage(patch.imageFile)
  } else if (patch.image_url != null) {
    updates.image_url = patch.image_url.trim()
  }

  const { data, error } = await supabase
    .from('bracelet_beads')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throwBeadsMigrationHint(formatErrorMessage(error))
  return normalizeBead(data as Record<string, unknown>)
}

export async function deleteBraceletBead(id: string): Promise<void> {
  const { error } = await supabase.from('bracelet_beads').delete().eq('id', id)
  if (error) throwBeadsMigrationHint(formatErrorMessage(error))
}
