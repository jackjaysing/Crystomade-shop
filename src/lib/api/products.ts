import { formatErrorMessage } from '../formatError'
import { normalizeProduct } from '../normalizeProduct'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET } from '../supabase'
import type { Product, ProductEditData, ProductFormData } from '../types'

/** 取得所有商品（依上架時間新到舊） */
export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(formatErrorMessage(error))
  return (data ?? []).map((row) =>
    normalizeProduct(row as Record<string, unknown>)
  )
}

/** 上傳單張圖片至 Storage，回傳公開 URL */
async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** 批次上傳相簿圖片 */
async function uploadGalleryImages(files: File[]): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    urls.push(await uploadProductImage(file))
  }
  return urls
}

/** 後台：新增商品並上架 */
export async function createProduct(form: ProductFormData): Promise<Product> {
  if (!form.coverFile) {
    throw new Error('請上傳封面照片')
  }

  const image_url = await uploadProductImage(form.coverFile)
  const gallery_urls =
    form.galleryFiles.length > 0
      ? await uploadGalleryImages(form.galleryFiles)
      : []

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: form.name,
      category: form.category,
      price: form.price,
      tags: form.tags,
      image_url,
      gallery_urls,
      description: form.description,
      stock: form.stock,
      status: 'available',
    })
    .select()
    .single()

  if (error) throw error
  return data as Product
}

/** 後台：更新已上架商品 */
export async function updateProduct(
  productId: string,
  form: ProductEditData,
  currentImageUrl: string
): Promise<Product> {
  const image_url = form.coverFile
    ? await uploadProductImage(form.coverFile)
    : currentImageUrl

  const newGalleryUrls =
    form.galleryFiles.length > 0
      ? await uploadGalleryImages(form.galleryFiles)
      : []

  const stock = Math.max(0, form.stock)
  const status = stock <= 0 ? 'sold' : 'available'

  const { data, error } = await supabase
    .from('products')
    .update({
      name: form.name.trim(),
      category: form.category,
      price: form.price,
      tags: form.tags,
      image_url,
      gallery_urls: [...form.existingGalleryUrls, ...newGalleryUrls],
      description: form.description,
      stock,
      status,
    })
    .eq('id', productId)
    .select()
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeProduct(data as Record<string, unknown>)
}

/** 後台：將商品標記為已售出（庫存歸零） */
export async function markProductSold(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ status: 'sold', stock: 0 })
    .eq('id', productId)

  if (error) throw error
}

/** 後台：永久刪除商品（若已有訂單則無法刪除） */
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', productId)

  if (error) {
    const msg = formatErrorMessage(error)
    if (/foreign key|23503|violates.*constraint|RESTRICT/i.test(msg)) {
      throw new Error(
        '此商品已有訂單紀錄，無法刪除。可先設為已售出，或待訂單處理後再試。'
      )
    }
    if (/policy|permission|42501/i.test(msg)) {
      throw new Error(
        '資料庫尚未允許刪除商品，請在 Supabase SQL Editor 執行 supabase/migration-add-product-delete.sql'
      )
    }
    throw new Error(msg)
  }
}
