import type { Product, ProductCategory } from './types'

const VALID_CATEGORIES: ProductCategory[] = ['手串', '擺件', '礦石']

function parseCategory(value: unknown): ProductCategory {
  const s = String(value ?? '')
  if (VALID_CATEGORIES.includes(s as ProductCategory)) {
    return s as ProductCategory
  }
  return '礦石'
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

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    category: parseCategory(row.category),
    price: typeof price === 'number' ? price : Number(price) || 0,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    image_url: String(row.image_url ?? ''),
    gallery_urls: Array.isArray(row.gallery_urls)
      ? row.gallery_urls.map(String)
      : [],
    status,
    stock,
    description: String(row.description ?? ''),
    created_at: String(row.created_at ?? ''),
    deleted_at: row.deleted_at != null ? String(row.deleted_at) : null,
    is_hot: Boolean(row.is_hot),
    sort_order: Number(row.sort_order ?? 0),
  }
}
