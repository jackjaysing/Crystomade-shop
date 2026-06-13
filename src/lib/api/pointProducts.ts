import { buildPointProductUpdateSummary } from '../adminChangeSummary'
import { recordAdminActivity } from './adminActivityLog'
import { compressImageForUpload } from '../browserImage'
import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET, STORAGE_IMAGE_CACHE_CONTROL } from '../supabase'
import type { PointProduct, PointProductFormData } from '../types'

function normalizePointProduct(row: Record<string, unknown>): PointProduct {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    image_url: String(row.image_url ?? ''),
    required_points:
      typeof row.required_points === 'number'
        ? row.required_points
        : Number(row.required_points) || 0,
    stock: typeof row.stock === 'number' ? row.stock : Number(row.stock) || 0,
    is_active: Boolean(row.is_active ?? true),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

async function uploadPointProductImage(file: File): Promise<string> {
  const compressed = await compressImageForUpload(file, 'card')
  const ext = compressed.name.split('.').pop() ?? 'jpg'
  const path = `point-shop/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, compressed, { cacheControl: STORAGE_IMAGE_CACHE_CONTROL, upsert: false })

  if (error) throw error
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function fetchPointProductById(id: string): Promise<PointProduct | null> {
  const { data, error } = await supabase
    .from('point_products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return normalizePointProduct(data as Record<string, unknown>)
}

async function nextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('point_products')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  if (error) {
    const msg = formatErrorMessage(error)
    if (/row-level security|RLS/i.test(msg)) {
      throw new Error(
        '點數商品權限未設定完成，請在 Supabase SQL Editor 執行 supabase/migration-fix-point-products-rls.sql'
      )
    }
    throw new Error(msg)
  }
  const max = data?.[0]?.sort_order
  return typeof max === 'number' ? max + 1 : 0
}

/** 前台：上架中的點數商品 */
export async function fetchActivePointProducts(): Promise<PointProduct[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('point_products')
    .select('*')
    .eq('is_active', true)
    .gt('stock', 0)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    if (/point_products|42P01/i.test(formatErrorMessage(error))) return []
    throw new Error(formatErrorMessage(error))
  }

  return (data ?? []).map((row) =>
    normalizePointProduct(row as Record<string, unknown>)
  )
}

/** 後台：全部點數商品 */
export async function fetchAllPointProducts(): Promise<PointProduct[]> {
  const { data, error } = await supabase
    .from('point_products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/point_products|42P01/i.test(msg)) {
      throw new Error(
        '資料庫尚未啟用點數商城，請在 Supabase SQL Editor 執行 supabase/migration-add-point-shop.sql'
      )
    }
    if (/row-level security|RLS/i.test(msg)) {
      throw new Error(
        '點數商品權限未設定完成，請在 Supabase SQL Editor 執行 supabase/migration-fix-point-products-rls.sql'
      )
    }
    throw new Error(msg)
  }

  return (data ?? []).map((row) =>
    normalizePointProduct(row as Record<string, unknown>)
  )
}

export async function createPointProduct(
  form: PointProductFormData
): Promise<PointProduct> {
  if (!form.name.trim()) throw new Error('請填寫商品名稱')
  if (form.required_points <= 0) throw new Error('所需點數須大於 0')
  if (!form.imageFile) throw new Error('請上傳商品圖片')

  const image_url = await uploadPointProductImage(form.imageFile)
  const sort_order = await nextSortOrder()

  const { data, error } = await supabase
    .from('point_products')
    .insert({
      name: form.name.trim(),
      image_url,
      required_points: Math.floor(form.required_points),
      stock: Math.max(0, Math.floor(form.stock)),
      is_active: form.is_active,
      sort_order,
    })
    .select()
    .single()

  if (error) {
    const msg = formatErrorMessage(error)
    if (/row-level security|RLS/i.test(msg)) {
      throw new Error(
        '點數商品權限未設定完成，請在 Supabase SQL Editor 執行 supabase/migration-fix-point-products-rls.sql'
      )
    }
    throw new Error(msg)
  }

  const product = normalizePointProduct(data as Record<string, unknown>)
  void recordAdminActivity({
    action: 'create',
    entityType: 'point_product',
    entityId: product.id,
    entityLabel: product.name,
    summary: `新增點數商品「${product.name}」：所需點數 ${product.required_points} 點；庫存 ${product.stock} 件`,
  })
  return product
}

export async function updatePointProduct(
  id: string,
  patch: Partial<{
    name: string
    required_points: number
    stock: number
    is_active: boolean
    imageFile: File | null
  }>
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (patch.name != null) payload.name = patch.name.trim()
  if (patch.required_points != null) {
    payload.required_points = Math.max(1, Math.floor(patch.required_points))
  }
  if (patch.stock != null) payload.stock = Math.max(0, Math.floor(patch.stock))
  if (patch.is_active != null) payload.is_active = patch.is_active
  if (patch.imageFile) payload.image_url = await uploadPointProductImage(patch.imageFile)

  const beforeProduct = await fetchPointProductById(id)
  if (!beforeProduct) throw new Error('找不到點數商品')

  const { data: afterRow, error } = await supabase
    .from('point_products')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const msg = formatErrorMessage(error)
    if (/row-level security|RLS/i.test(msg)) {
      throw new Error(
        '點數商品權限未設定完成，請在 Supabase SQL Editor 執行 supabase/migration-fix-point-products-rls.sql'
      )
    }
    throw new Error(msg)
  }

  const afterProduct = normalizePointProduct(afterRow as Record<string, unknown>)
  await recordAdminActivity({
    action: 'update',
    entityType: 'point_product',
    entityId: id,
    entityLabel: afterProduct.name,
    summary: buildPointProductUpdateSummary(beforeProduct, afterProduct),
  })
}

export async function deletePointProduct(id: string): Promise<void> {
  const beforeProduct = await fetchPointProductById(id)
  const productName = beforeProduct?.name ?? id

  const { error } = await supabase.from('point_products').delete().eq('id', id)
  if (error) {
    const msg = formatErrorMessage(error)
    if (/row-level security|RLS/i.test(msg)) {
      throw new Error(
        '點數商品權限未設定完成，請在 Supabase SQL Editor 執行 supabase/migration-fix-point-products-rls.sql'
      )
    }
    throw new Error(msg)
  }

  void recordAdminActivity({
    action: 'delete',
    entityType: 'point_product',
    entityId: id,
    entityLabel: productName,
    summary: `刪除點數商品「${productName}」`,
  })
}
