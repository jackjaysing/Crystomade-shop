import { parseBraceletStyle } from '../constants/braceletStyles'
import { parseStudioLocation } from '../constants/studioLocations'
import type { Product, ProductCategory, ProductVariant } from './types'
import { resolveProductSubcategory } from './productSubcategory'
import { sanitizeFiveElements } from './fiveElements'
import { parseDiscountZhe } from './productPricing'
import { sanitizeProductTags } from './productTags'

const VALID_CATEGORIES: ProductCategory[] = ['手串', '配飾', '擺件', '礦石']

function parseCategory(value: unknown): ProductCategory {
  const s = String(value ?? '')
  if (VALID_CATEGORIES.includes(s as ProductCategory)) {
    return s as ProductCategory
  }
  return '礦石'
}

export function normalizeProductVariant(
  row: Record<string, unknown>,
  fallbackProductId = ''
): ProductVariant | null {
  const id = String(row.id ?? '').trim()
  const name = String(row.name ?? '').trim()
  if (!id || !name) return null
  const price = Number(row.price)
  const stock = Number(row.stock)
  return {
    id,
    product_id: String(row.product_id ?? fallbackProductId),
    name,
    price: Number.isFinite(price) ? price : 0,
    stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
    sort_order: Number(row.sort_order ?? 0) || 0,
    created_at: String(row.created_at ?? ''),
  }
}

function normalizeVariants(
  row: Record<string, unknown>,
  productId: string
): ProductVariant[] {
  const raw =
    row.product_variants ??
    row.variants ??
    (Array.isArray(row.product_variant) ? row.product_variant : null)
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) =>
      item && typeof item === 'object'
        ? normalizeProductVariant(item as Record<string, unknown>, productId)
        : null
    )
    .filter((v): v is ProductVariant => v != null)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
    )
}

/** 將 Supabase 回傳資料整理成安全格式，避免 tags 為 null 導致崩潰 */
export function normalizeProduct(row: Record<string, unknown>): Product {
  const tags = row.tags
  const price = row.price
  const status = row.status === 'sold' ? 'sold' : 'available'
  const rawStock = row.stock
  const stock =
    typeof rawStock === 'number'
      ? rawStock
      : rawStock != null
        ? Number(rawStock) || 0
        : status === 'sold'
          ? 0
          : 1

  const category = parseCategory(row.category)
  const id = String(row.id ?? '')
  const variants = normalizeVariants(row, id)

  return {
    id,
    name: String(row.name ?? ''),
    category,
    bracelet_style:
      category === '手串' ? parseBraceletStyle(row.bracelet_style) ?? '通用' : null,
    subcategory: resolveProductSubcategory(
      category,
      row.subcategory != null ? String(row.subcategory) : null
    ),
    price: typeof price === 'number' ? price : Number(price) || 0,
    discount_zhe: parseDiscountZhe(row.discount_zhe),
    cost: 0,
    studio_location: parseStudioLocation(row.studio_location),
    tags: sanitizeProductTags(Array.isArray(tags) ? tags.map(String) : []),
    five_elements: sanitizeFiveElements(
      Array.isArray(row.five_elements) ? row.five_elements.map(String) : []
    ),
    image_url: String(row.image_url ?? ''),
    gallery_urls: Array.isArray(row.gallery_urls)
      ? row.gallery_urls.map(String)
      : [],
    status,
    stock: variants.length
      ? variants.reduce((sum, v) => sum + v.stock, 0)
      : stock,
    variants,
    description: String(row.description ?? ''),
    created_at: String(row.created_at ?? ''),
    deleted_at: row.deleted_at != null ? String(row.deleted_at) : null,
    is_hot: Boolean(row.is_hot),
    is_quick_add: Boolean(row.is_quick_add),
    is_studio_available: Boolean(row.is_studio_available),
    is_private_custom: Boolean(row.is_private_custom),
    generates_soul_card: row.generates_soul_card === false ? false : true,
    sort_order: Number(row.sort_order ?? 0),
  }
}
