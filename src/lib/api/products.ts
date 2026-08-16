import {
  mergeProductCosts,
  fetchProductCostsByIds,
  fetchProductCostsMap,
  upsertProductCost,
} from './productCosts'
import {
  buildProductUpdateSummary,
  formatAdminMoney,
} from '../adminChangeSummary'
import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { compressImageForUpload } from '../browserImage'
import { applyCrystomadeWatermark } from '../watermarkProductImage'
import { normalizeProduct } from '../normalizeProduct'
import { sanitizeFiveElements } from '../fiveElements'
import { sanitizeSubcategoryForSave } from '../productSubcategory'
import { sanitizeProductTags } from '../productTags'
import { isProductActive } from '../productStock'
import { sortProducts } from '../sortProducts'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET, STORAGE_IMAGE_CACHE_CONTROL } from '../supabase'
import type {
  Product,
  ProductEditData,
  ProductFormData,
  ProductGalleryEditItem,
  ProductVariantInput,
} from '../types'

const PRODUCT_SELECT_WITH_VARIANTS = '*, product_variants(*)'

function isMissingVariantsRelation(message: string): boolean {
  return /product_variants|PGRST200|PGRST205|relationship|42703/i.test(message)
}

/** 後台：同步商品規格（空陣列＝清除規格，改回單庫存） */
export async function syncProductVariants(
  productId: string,
  variants: ProductVariantInput[]
): Promise<void> {
  const cleaned = variants
    .map((v, index) => ({
      id: v.id?.trim() || undefined,
      name: v.name.trim(),
      price: Math.max(0, Number(v.price) || 0),
      stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
      sort_order: index,
    }))
    .filter((v) => v.name.length > 0)

  const { data: existing, error: existingError } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)

  if (existingError) {
    const msg = formatErrorMessage(existingError)
    if (isMissingVariantsRelation(msg)) {
      if (cleaned.length === 0) return
      throw new Error(
        '資料庫尚未啟用商品規格，請在 Supabase SQL Editor 執行 supabase/migration-product-variants.sql'
      )
    }
    throw new Error(msg)
  }

  const existingIds = new Set(
    (existing ?? []).map((row) => String((row as { id: string }).id))
  )
  const keepIds = new Set(
    cleaned.map((v) => v.id).filter((id): id is string => Boolean(id))
  )
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id))

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('product_variants')
      .delete()
      .in('id', toDelete)
    if (deleteError) throw new Error(formatErrorMessage(deleteError))
  }

  for (const variant of cleaned) {
    if (variant.id && existingIds.has(variant.id)) {
      const { error } = await supabase
        .from('product_variants')
        .update({
          name: variant.name,
          price: variant.price,
          stock: variant.stock,
          sort_order: variant.sort_order,
        })
        .eq('id', variant.id)
        .eq('product_id', productId)
      if (error) throw new Error(formatErrorMessage(error))
    } else {
      const { error } = await supabase.from('product_variants').insert({
        product_id: productId,
        name: variant.name,
        price: variant.price,
        stock: variant.stock,
        sort_order: variant.sort_order,
      })
      if (error) throw new Error(formatErrorMessage(error))
    }
  }

  if (cleaned.length > 0) {
    const stockSum = cleaned.reduce((sum, v) => sum + v.stock, 0)
    const minPrice = Math.min(...cleaned.map((v) => v.price))
    const { error } = await supabase
      .from('products')
      .update({
        stock: stockSum,
        price: minPrice,
        status: stockSum <= 0 ? 'sold' : 'available',
      })
      .eq('id', productId)
    if (error) throw new Error(formatErrorMessage(error))
  }
}

function resolveCreateStockAndPrice(form: ProductFormData): {
  stock: number
  price: number
} {
  const cleaned = (form.variants ?? [])
    .map((v) => ({
      name: v.name.trim(),
      price: Math.max(0, Number(v.price) || 0),
      stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
    }))
    .filter((v) => v.name.length > 0)

  if (cleaned.length === 0) {
    return { stock: form.stock, price: form.price }
  }

  return {
    stock: cleaned.reduce((sum, v) => sum + v.stock, 0),
    price: Math.min(...cleaned.map((v) => v.price)),
  }
}

function mapActiveProducts(rows: Record<string, unknown>[]): Product[] {
  return sortProducts(
    rows.map((row) => normalizeProduct(row)).filter(isProductActive)
  )
}

const PRODUCTS_CACHE_MS = 60_000
let storefrontProductsCache: { data: Product[]; at: number } | null = null

function isMissingOptionalProductColumn(message: string): boolean {
  return /is_studio_available|is_private_custom|studio_location|42703|column/i.test(
    message
  )
}

export function invalidateStorefrontProductsCache(): void {
  storefrontProductsCache = null
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
export async function fetchProducts(options?: {
  bypassCache?: boolean
  /** 後台專用：透過私密 RPC 合併成本；前台勿開啟 */
  includeCosts?: boolean
}): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const now = Date.now()
  if (
    !options?.bypassCache &&
    !options?.includeCosts &&
    storefrontProductsCache &&
    now - storefrontProductsCache.at < PRODUCTS_CACHE_MS
  ) {
    return storefrontProductsCache.data
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT_WITH_VARIANTS)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingVariantsRelation(msg) || /deleted_at|42703|column|sort_order/i.test(msg)) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('products')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (fallbackError) {
        const fbMsg = formatErrorMessage(fallbackError)
        if (/deleted_at|42703|column|sort_order/i.test(fbMsg)) {
          const { data: legacy, error: legacyError } = await supabase
            .from('products')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })
          if (legacyError) throw new Error(formatErrorMessage(legacyError))
          let result = mapActiveProducts((legacy ?? []) as Record<string, unknown>[])
          if (options?.includeCosts) {
            const costs = await fetchProductCostsMap()
            result = mergeProductCosts(result, costs)
          }
          if (!options?.includeCosts) {
            storefrontProductsCache = { data: result, at: Date.now() }
          }
          return result
        }
        throw new Error(fbMsg)
      }
      let result = mapActiveProducts((fallback ?? []) as Record<string, unknown>[])
      if (options?.includeCosts) {
        const costs = await fetchProductCostsMap()
        result = mergeProductCosts(result, costs)
      }
      if (!options?.includeCosts) {
        storefrontProductsCache = { data: result, at: Date.now() }
      }
      return result
    }
    throw new Error(msg)
  }

  let result = mapActiveProducts((data ?? []) as Record<string, unknown>[])
  if (options?.includeCosts) {
    const costs = await fetchProductCostsMap()
    result = mergeProductCosts(result, costs)
  }
  if (!options?.includeCosts) {
    storefrontProductsCache = { data: result, at: Date.now() }
  }
  return result
}

/** 依 ID 取得單一上架商品（詳情頁用） */
export async function fetchProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT_WITH_VARIANTS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingVariantsRelation(msg) || /deleted_at|42703|column/i.test(msg)) {
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
    .select(PRODUCT_SELECT_WITH_VARIANTS)
    .is('deleted_at', null)
    .eq('is_quick_add', true)
    .gt('stock', 0)
    .eq('status', 'available')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/is_quick_add|42703|column|product_variants/i.test(msg)) {
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
  const compressed = await compressImageForUpload(file, 'product')
  const watermarked = await applyCrystomadeWatermark(compressed)
  const ext = watermarked.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, watermarked, { cacheControl: STORAGE_IMAGE_CACHE_CONTROL, upsert: false })

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
export async function createProduct(
  form: ProductFormData,
  options?: { updateCost?: boolean }
): Promise<Product> {
  if (!form.coverFile) {
    throw new Error('請上傳封面照片')
  }

  const updateCost = options?.updateCost === true

  const image_url = await uploadProductImage(form.coverFile)
  const gallery_urls =
    form.galleryFiles.length > 0
      ? await uploadGalleryImages(form.galleryFiles)
      : []

  const sort_order = await getSortOrderForNewProduct(form.is_hot)
  const { stock, price } = resolveCreateStockAndPrice(form)

  const payload = {
    name: form.name,
    category: form.category,
    bracelet_style:
      form.category === '手串' ? form.bracelet_style ?? '通用' : null,
    subcategory: sanitizeSubcategoryForSave(form.category, form.subcategory),
    price,
    discount_zhe: form.discount_zhe,
    studio_location: form.studio_location,
    tags: sanitizeProductTags(form.tags),
    five_elements: sanitizeFiveElements(form.five_elements),
    image_url,
    gallery_urls,
    description: form.description,
    stock,
    status: 'available' as const,
    is_hot: form.is_hot,
    is_quick_add: form.is_quick_add,
    is_studio_available: form.is_studio_available,
    is_private_custom: form.is_private_custom,
    generates_soul_card: form.generates_soul_card,
    sort_order,
  }

  let { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single()

  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingOptionalProductColumn(msg)) {
      const {
        is_studio_available: _omitStudio,
        is_private_custom: _omitPrivate,
        studio_location: _omitStudioLocation,
        ...fallbackPayload
      } = payload
      const retry = await supabase
        .from('products')
        .insert(fallbackPayload)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }
  }

  if (error) throw new Error(formatErrorMessage(error))
  await syncProductVariants(String((data as { id: string }).id), form.variants ?? [])

  const refreshed = await fetchProductById(String((data as { id: string }).id))
  const product = refreshed ?? normalizeProduct(data as Record<string, unknown>)
  if (updateCost) {
    product.cost = await upsertProductCost(product.id, form.cost)
  }
  void recordAdminActivity({
    action: 'create',
    entityType: 'product',
    entityId: product.id,
    entityLabel: product.name,
    summary: `新增商品「${product.name}」：原價 ${formatAdminMoney(product.price)}；庫存 ${product.stock} 件`,
  })
  invalidateStorefrontProductsCache()
  return product
}

/** 後台：更新已上架商品 */
export async function updateProduct(
  productId: string,
  form: ProductEditData,
  currentImageUrl: string,
  options?: { updateCost?: boolean }
): Promise<Product> {
  const updateCost = options?.updateCost === true

  const { data: beforeRow, error: beforeError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (beforeError || !beforeRow) {
    throw new Error(beforeError ? formatErrorMessage(beforeError) : '找不到商品')
  }

  const beforeProduct = normalizeProduct(beforeRow as Record<string, unknown>)
  if (updateCost) {
    const beforeCosts = await fetchProductCostsByIds([productId])
    beforeProduct.cost = beforeCosts.get(productId.toLowerCase()) ?? beforeCosts.get(productId) ?? 0
  }

  const image_url = form.coverFile
    ? await uploadProductImage(form.coverFile)
    : currentImageUrl

  const gallery_urls = await resolveGalleryItems(form.galleryItems)
  const hasVariants = (form.variants ?? []).some((v) => v.name.trim())
  const stock = hasVariants
    ? (form.variants ?? []).reduce(
        (sum, v) => sum + Math.max(0, Math.floor(Number(v.stock) || 0)),
        0
      )
    : Math.max(0, form.stock)
  const price = hasVariants
    ? Math.min(
        ...((form.variants ?? [])
          .filter((v) => v.name.trim())
          .map((v) => Math.max(0, Number(v.price) || 0)) || [form.price])
      )
    : form.price
  const status = stock <= 0 ? 'sold' : 'available'

  const payload = {
    name: form.name.trim(),
    category: form.category,
    bracelet_style:
      form.category === '手串' ? form.bracelet_style ?? '通用' : null,
    subcategory: sanitizeSubcategoryForSave(form.category, form.subcategory),
    price,
    discount_zhe: form.discount_zhe,
    studio_location: form.studio_location,
    tags: sanitizeProductTags(form.tags),
    five_elements: sanitizeFiveElements(form.five_elements),
    image_url,
    gallery_urls,
    description: form.description,
    stock,
    status,
    is_hot: form.is_hot,
    is_quick_add: form.is_quick_add,
    is_studio_available: form.is_studio_available,
    is_private_custom: form.is_private_custom,
    generates_soul_card: form.generates_soul_card,
  }

  let { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select()
    .single()

  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingOptionalProductColumn(msg)) {
      const {
        is_studio_available: _omitStudio,
        is_private_custom: _omitPrivate,
        studio_location: _omitStudioLocation,
        ...fallbackPayload
      } = payload
      const retry = await supabase
        .from('products')
        .update(fallbackPayload)
        .eq('id', productId)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }
  }

  if (error) throw new Error(formatErrorMessage(error))
  await syncProductVariants(productId, form.variants ?? [])
  const refreshed = await fetchProductById(productId)
  const product = refreshed ?? normalizeProduct(data as Record<string, unknown>)
  if (updateCost) {
    product.cost = await upsertProductCost(product.id, form.cost)
  }
  await recordAdminActivity({
    action: 'update',
    entityType: 'product',
    entityId: product.id,
    entityLabel: product.name,
    summary: buildProductUpdateSummary(beforeProduct, product),
  })
  invalidateStorefrontProductsCache()
  return product
}

/** 後台：將商品標記為已售出（庫存歸零） */
export async function markProductSold(productId: string): Promise<void> {
  const { data: row } = await supabase
    .from('products')
    .select('name, stock')
    .eq('id', productId)
    .single()

  const { error } = await supabase
    .from('products')
    .update({ status: 'sold', stock: 0 })
    .eq('id', productId)

  if (error) throw error

  const name = row?.name ? String(row.name) : productId
  const stock =
    typeof row?.stock === 'number' ? row.stock : Number(row?.stock) || 0
  await recordAdminActivity({
    action: 'status',
    entityType: 'product',
    entityId: productId,
    entityLabel: name,
    summary: `將商品「${name}」標記為已售出：庫存 ${stock} 件 → 0 件`,
  })
  invalidateStorefrontProductsCache()
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
  invalidateStorefrontProductsCache()
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
  invalidateStorefrontProductsCache()
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
  invalidateStorefrontProductsCache()
  return product
}
