import { productHasVariants } from './productPricing'
import type { Product } from './types'

/** 是否仍在上架中（未軟刪除） */
export function isProductActive(product: Product): boolean {
  return !product.deleted_at
}

/** 可用庫存（有規格時加總） */
export function getProductAvailableStock(product: Product): number {
  if (productHasVariants(product)) {
    return product.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0)
  }
  return Math.max(0, product.stock)
}

/** 是否已售罄（庫存 0 或手動標記 sold） */
export function isProductSoldOut(product: Product): boolean {
  return product.status === 'sold' || getProductAvailableStock(product) <= 0
}
