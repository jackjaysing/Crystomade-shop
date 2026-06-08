import {
  buildProductUpdateSummary,
  formatAdminMoney,
} from '../adminChangeSummary'
import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { applyCrystomadeWatermark } from '../watermarkProductImage'
import { normalizeProduct } from '../normalizeProduct'
import { sanitizeFiveElements } from '../fiveElements'
import { sanitizeSubcategoryForSave } from '../productSubcategory'
import { sanitizeProductTags } from '../productTags'
import { isProductActive } from '../productStock'
import { sortProducts } from '../sortProducts'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET } from '../supabase'
import type {
  Product,
  ProductEditData,
  ProductFormData,
  ProductGalleryEditItem,
} from '../types'

function mapActiveProducts(rows: Record<string, unknown>[]): Product[] {
  return sortProducts(
    rows.map((row) => normalizeProduct(row)).filter(isProductActive)
  )
}

/** 新商品排在同區塊最前（sort_order 小於現有最小值） */
async function getSortOrderForNewProduct(isHot: boolean): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('sort_order')
    .is('deleted_at', null)
    .eq('is_hot', isHot)
    .order('sort_order', { ascending: true })
    .limit(1)

  if (error) {
    if (/is_hot|42703|column/i.test(formatErrorMessage(error))) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('products')
        .select('sort_order')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .limit(1)

      if (fallbackError) throw new Error(formatErrorMessage(fallbackError))
      const min = fallback?.[0]?.sort_order
      return typeof min === 'number' ? min - 1 : 0
    }
    throw new Error(formatErrorMessage(error))
  }

  const min = data?.[0]?.sort_order
  return typeof min === 'number' ? min - 1 : 0
}

/** 取得上架中商品（排除已軟刪除；排序由 sortProducts 處理） */
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
        .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

      if (fallbackError) throw new Error(formatErrorMessage(fallbackError))
      return mapActiveProducts((fallback ?? []) as Record<string, unknown>[])
    }
    throw new Error(msg)
  }

  return mapActiveProducts((data ?? []) as Record<string, unknown>[])
}

/** 依 ID 取得單一上架商品（詳情頁用） */
export async function fetchProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    const msg = formatErrorMessage(error)
    if (/deleted_at|42703|column/i.test(msg)) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (fallbackError) throw new Error(formatErrorMessage(fallbackError))
      if (!fallback) return null
      const product = normalizeProduct(fallback as Record<string, unknown>)
      return isProductActive(product) ? product : null
    }
    throw new Error(msg)
  }

  if (!data) return null
  const product = normalizeProduct(data as Record<string, unknown>)
  return isProductActive(product) ? product : null
}

/** 購物車快捷加購推薦商品（與全站同價） */
export async function fetchQuickAddProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .is('deleted_at', null)
    .eq('is_quick_add', true)
    .gt('stock', 0)
    .eq('status', 'available')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/is_quick_add|42703|column/i.test(msg)) {
      return []
    }
    throw new Error(msg)
  }

  return sortProducts(
    (data ?? []).map((row) => normalizeProduct(row as Record<string, unknown>))
  )
}

/** 上傳單張圖片至 Storage，回傳公開 URL */
async function uploadProductImage(file: File): Promise<string> {
  const watermarked = await applyCrystomadeWatermark(file)
  const ext = watermarked.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, watermarked, { cacheControl: '3600', upsert: false })

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

/** 依排序後的相簿項目產生 URL 列表 */
async function resolveGalleryItems(
  items: ProductGalleryEditItem[]
): Promise<string[]> {
  const urls: string[] = []
  for (const item of items) {
    if (item.kind === 'existing') {
      urls.push(item.url)
    } else {
      urls.push(await uploadProductImage(item.file))
    }
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

  const sort_order = await getSortOrderForNewProduct(form.is_hot)

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: form.name,
      category: form.category,
      bracelet_style:
        form.category === '手串' ? form.bracelet_style ?? '通用' : null,
      subcategory: sanitizeSubcategoryForSave(form.category, form.subcategory),
      price: form.price,
      discount_zhe: form.discount_zhe,
      tags: sanitizeProductTags(form.tags),
      five_elements: sanitizeFiveElements(form.five_elements),
      image_url,
      gallery_urls,
      description: form.description,
      stock: form.stock,
      status: 'available',
      is_hot: form.is_hot,
      is_quick_add: form.is_quick_add,
      sort_order,
    })
    .select()
    .single()

  if (error) throw error
  const product = normalizeProduct(data as Record<string, unknown>)
  void recordAdminActivity({
    action: 'create',
    entityType: 'product',
    entityId: product.id,
    entityLabel: product.name,
    summary: `新增商品「${product.name}」：原價 ${formatAdminMoney(product.price)}；庫存 ${product.stock} 件`,
  })
  return product
}

/** 後台：更新已上架商品 */
export async function updateProduct(
  productId: string,
  form: ProductEditData,
  currentImageUrl: string
): Promise<Product> {
  const { data: beforeRow, error: beforeError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (beforeError || !beforeRow) {
    throw new Error(beforeError ? formatErrorMessage(beforeError) : '找不到商品')
  }

  const beforeProduct = normalizeProduct(beforeRow as Record<string, unknown>)

  const image_url = form.coverFile
    ? await uploadProductImage(form.coverFile)
    : currentImageUrl

  const gallery_urls = await resolveGalleryItems(form.galleryItems)

  const stock = Math.max(0, form.stock)
  const status = stock <= 0 ? 'sold' : 'available'

  const { data, error } = await supabase
    .from('products')
    .update({
      name: form.name.trim(),
      category: form.category,
      bracelet_style:
        form.category === '手串' ? form.bracelet_style ?? '通用' : null,
      subcategory: sanitizeSubcategoryForSave(form.category, form.subcategory),
      price: form.price,
      discount_zhe: form.discount_zhe,
      tags: sanitizeProductTags(form.tags),
      five_elements: sanitizeFiveElements(form.five_elements),
      image_url,
      gallery_urls,
      description: form.description,
      stock,
      status,
      is_hot: form.is_hot,
      is_quick_add: form.is_quick_add,
    })
    .eq('id', productId)
    .select()
    .single()

  if (error) throw new Error(formatErrorMessage(error))
  const product = normalizeProduct(data as Record<string, unknown>)
  void recordAdminActivity({
    action: 'update',
    entityType: 'product',
    entityId: product.id,
    entityLabel: product.name,
    summary: buildProductUpdateSummary(beforeProduct, form),
  })
  return product
}

/** 後台：將商品標記為已售出（庫存歸零） */
export async function markProductSold(productId: string): Promise<void> {
  const { data: row } = await supabase
    .from('products')
    .select('name')
    .eq('id', productId)
    .single()

  const { error } = await supabase
    .from('products')
    .update({ status: 'sold', stock: 0 })
    .eq('id', productId)

  if (error) throw error

  const name = row?.name ? String(row.name) : productId
  void recordAdminActivity({
    action: 'status',
    entityType: 'product',
    entityId: productId,
    entityLabel: name,
    summary: `將商品「${name}」標記為已售出`,
  })
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
  const product = normalizeProduct(data as Record<string, unknown>)
  void recordAdminActivity({
    action: 'status',
    entityType: 'product',
    entityId: product.id,
    entityLabel: product.name,
    summary: `${isHot ? '設為' : '取消'}熱門商品「${product.name}」`,
  })
  return product
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

  if (current.is_hot !== target.is_hot) return

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

  const dirLabel = direction === 'up' ? '上移' : '下移'
  void recordAdminActivity({
    action: 'sort',
    entityType: 'product',
    entityId: current.id,
    entityLabel: current.name,
    summary: `調整商品排序：「${current.name}」${dirLabel}`,
  })
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
  const { data: productRow } = await supabase
    .from('products')
    .select('name')
    .eq('id', productId)
    .single()

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

  const name = productRow?.name ? String(productRow.name) : productId
  void recordAdminActivity({
    action: 'delete',
    entityType: 'product',
    entityId: productId,
    entityLabel: name,
    summary: `刪除商品「${name}」`,
  })
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
  const product = normalizeProduct(data as Record<string, unknown>)
  void recordAdminActivity({
    action: 'restore',
    entityType: 'product',
    entityId: product.id,
    entityLabel: product.name,
    summary: `重新上架商品「${product.name}」`,
  })
  return product
}
