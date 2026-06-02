import type { Product } from './types'

type PricedProduct = Pick<Product, 'price' | 'discount_zhe'>

/** 解析後台輸入的折扣（折）；空值或無效則無折扣 */
export function parseDiscountZhe(value: unknown): number | null {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0 || n >= 10) return null
  return Math.round(n * 10) / 10
}

/** 依原價與折扣（折）計算特價 */
export function calcSalePrice(
  originalPrice: number,
  discountZhe: number | null | undefined
): number {
  if (originalPrice <= 0) return 0
  const zhe = discountZhe ?? null
  if (zhe == null || zhe <= 0 || zhe >= 10) return originalPrice
  return Math.max(1, Math.round(originalPrice * (zhe / 10)))
}

export function getProductSalePrice(product: PricedProduct): number {
  return calcSalePrice(product.price, product.discount_zhe)
}

export function hasProductDiscount(product: PricedProduct): boolean {
  return getProductSalePrice(product) < product.price
}

/** 折扣顯示，如 8 折 */
export function formatDiscountZheLabel(discountZhe: number): string {
  const label =
    discountZhe % 1 === 0
      ? String(discountZhe)
      : discountZhe.toFixed(1).replace(/\.0$/, '')
  return `${label} 折`
}
