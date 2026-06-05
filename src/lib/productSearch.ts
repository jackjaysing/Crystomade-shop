import { getProductCategoryLabel } from '../constants/categories'
import type { Product } from './types'

/** 商品是否符合關鍵字搜尋 */
export function productMatchesSearchQuery(product: Product, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const haystack = [
    product.name,
    product.description,
    product.category,
    getProductCategoryLabel(product),
    product.bracelet_style ?? '',
    ...product.tags,
  ]
    .join(' ')
    .toLowerCase()

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token))
}
