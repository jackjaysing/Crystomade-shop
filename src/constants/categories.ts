import type { Product, ProductCategory } from '../lib/types'
import { getBraceletStyleLabel } from './braceletStyles'
import { getSubcategoryLabel } from './productSubcategories'

/** 商品品類選項 */
export interface CategoryOption {
  id: ProductCategory
  label: string
}

/** 前台品類篩選：手串、配飾、擺件、礦石 */
export const PRODUCT_CATEGORIES: CategoryOption[] = [
  { id: '手串', label: '手串' },
  { id: '配飾', label: '配飾' },
  { id: '擺件', label: '擺件' },
  { id: '礦石', label: '礦石' },
]

/** 品類顯示標籤 */
export function getCategoryLabel(category: ProductCategory): string {
  return PRODUCT_CATEGORIES.find((c) => c.id === category)?.label ?? category
}

/** 前台／後台品類標籤（手串含款式；配飾／擺件／礦石含細項） */
export function getProductCategoryLabel(
  product: Pick<Product, 'category' | 'bracelet_style' | 'subcategory'>
): string {
  if (product.category === '手串' && product.bracelet_style) {
    const style = getBraceletStyleLabel(product.bracelet_style)
    return style ? `手串 · ${style}` : '手串'
  }
  if (product.subcategory) {
    const sub = getSubcategoryLabel(product.subcategory)
    return sub ? `${getCategoryLabel(product.category)} · ${sub}` : getCategoryLabel(product.category)
  }
  return getCategoryLabel(product.category)
}

/** 商品卡片角標：手串＋款式分行顯示，避免與熱門圖示重疊 */
export function getProductCategoryBadgeLines(
  product: Pick<Product, 'category' | 'bracelet_style' | 'subcategory'>
): string[] {
  if (product.category === '手串' && product.bracelet_style) {
    const style = getBraceletStyleLabel(product.bracelet_style)
    if (style) return ['手串', style]
  }
  if (product.subcategory) {
    const sub = getSubcategoryLabel(product.subcategory)
    if (sub) return [getCategoryLabel(product.category), sub]
  }
  return [getCategoryLabel(product.category)]
}
