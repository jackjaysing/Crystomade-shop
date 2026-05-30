import type { Product } from './types'

/** 是否已售罄（庫存 0 或手動標記 sold） */
export function isProductSoldOut(product: Product): boolean {
  return product.status === 'sold' || product.stock <= 0
}
