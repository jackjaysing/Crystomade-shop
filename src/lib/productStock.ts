import type { Product } from './types'

/** 是否仍在上架中（未軟刪除） */
export function isProductActive(product: Product): boolean {
  return !product.deleted_at
}

/** 是否已售罄（庫存 0 或手動標記 sold） */
export function isProductSoldOut(product: Product): boolean {
  return product.status === 'sold' || product.stock <= 0
}
