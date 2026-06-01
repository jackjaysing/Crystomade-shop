import { formatErrorMessage } from '../formatError'
import { normalizeProduct } from '../normalizeProduct'
import { sanitizeProductTags } from '../productTags'
import { isProductActive } from '../productStock'
import { sortProducts } from '../sortProducts'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET } from '../supabase'
import type { Product, ProductEditData, ProductFormData } from '../types'

function mapActiveProducts(rows: Record<string, unknown>[]): Product[] {
  return sortProducts(
    rows.map((row) => normalizeProduct(row)).filter(isProductActive)
  )
}

async function getNextProductSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) throw new Error(formatErrorMessage(error))
  const max = data?.[0]?.sort_order
  return typeof max === 'number' ? max + 1 : 0
}

/** 取得上架中商品（排除已軟刪除，熱門置頂 + 自訂排序） */
export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/deleted_at|42703|column|sort_order/i.test(msg)) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (fallbackError) throw new Error(formatErrorMessage(fallbackError))
      return mapActiveProducts((fallback ?? []) as Record<string, unknown>[])
    }
    throw new Error(msg)
  }

  return mapActiveProducts((data ?? []) as Record<string, unknown>[])
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

  const sort_order = await getNextProductSortOrder()

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: form.name,
      category: form.category,
      price: form.price,
      tags: sanitizeProductTags(form.tags),
      image_url,
      gallery_urls,
      description: form.description,
      stock: form.stock,
      status: 'available',
      is_hot: form.is_hot,
      sort_order,
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
      tags: sanitizeProductTags(form.tags),
      image_url,
      gallery_urls: [...form.existingGalleryUrls, ...newGalleryUrls],
      description: form.description,
      stock,
      status,
      is_hot: form.is_hot,
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

/** 後台：切換熱門商品標示 */
export async function setProductHot(
  productId: string,
  isHot: boolean
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ is_hot: isHot })
    .eq('id', productId)
    .select()
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeProduct(data as Record<string, unknown>)
}

/** 後台：調整商品排序（與列表中相鄰項目交換 sort_order） */
export async function swapProductOrder(
  productId: string,
  direction: 'up' | 'down',
  products: Product[]
): Promise<void> {
  const index = products.findIndex((p) => p.id === productId)
  if (index < 0) return

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= products.length) return

  const current = products[index]
  const target = products[swapIndex]

  const { error: errorA } = await supabase
    .from('products')
    .update({ sort_order: target.sort_order })
    .eq('id', current.id)

  if (errorA) throw new Error(formatErrorMessage(errorA))

  const { error: errorB } = await supabase
    .from('products')
    .update({ sort_order: current.sort_order })
    .eq('id', target.id)

  if (errorB) throw new Error(formatErrorMessage(errorB))
}

/** 後台：取得已軟刪除商品（最新刪除優先） */
export async function fetchDeletedProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw new Error(formatErrorMessage(error))
  return (data ?? []).map((row) =>
    normalizeProduct(row as Record<string, unknown>)
  )
}

/** 後台：軟刪除商品（移入已刪除物品；須先完成出貨） */
export async function deleteProduct(productId: string): Promise<void> {
  const { data: pendingOrders, error: checkError } = await supabase
    .from('orders')
    .select('id')
    .eq('product_id', productId)
    .eq('status', 'pending')
    .limit(1)

  if (checkError) throw new Error(formatErrorMessage(checkError))
  if (pendingOrders && pendingOrders.length > 0) {
    throw new Error('此商品尚有未出貨訂單，請先完成出貨後再刪除。')
  }

  const { error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', productId)
    .is('deleted_at', null)

  if (error) throw new Error(formatErrorMessage(error))
}

/** 後台：重新上架已刪除商品 */
export async function restoreProduct(productId: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ deleted_at: null })
    .eq('id', productId)
    .not('deleted_at', 'is', null)
    .select()
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  return normalizeProduct(data as Record<string, unknown>)
}
