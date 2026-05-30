import type { ProductCategory } from '../lib/types'

/** 商品品類選項 */
export interface CategoryOption {
  id: ProductCategory
  label: string
}

/** 前台品類篩選：手串、擺件、礦石 */
export const PRODUCT_CATEGORIES: CategoryOption[] = [
  { id: '手串', label: '手串' },
  { id: '擺件', label: '擺件' },
  { id: '礦石', label: '礦石' },
]

/** 品類顯示標籤 */
export function getCategoryLabel(category: ProductCategory): string {
  return PRODUCT_CATEGORIES.find((c) => c.id === category)?.label ?? category
}
