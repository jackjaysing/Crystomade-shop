import type { Product, ProductVariant } from './types'

type PricedProduct = Pick<Product, 'price' | 'discount_zhe' | 'variants'>

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

export function productHasVariants(
  product: Pick<Product, 'variants'> | null | undefined
): boolean {
  return (product?.variants?.length ?? 0) > 0
}

export function getVariantSalePrice(
  variant: Pick<ProductVariant, 'price'>,
  discountZhe: number | null | undefined
): number {
  return calcSalePrice(variant.price, discountZhe)
}

/** 商品售價區間（有規格時取各規格特價；否則為商品本身） */
export function getProductPriceRange(product: PricedProduct): {
  min: number
  max: number
  minOriginal: number
  maxOriginal: number
} {
  if (productHasVariants(product)) {
    const salePrices = product.variants.map((v) =>
      getVariantSalePrice(v, product.discount_zhe)
    )
    const originals = product.variants.map((v) => v.price)
    return {
      min: Math.min(...salePrices),
      max: Math.max(...salePrices),
      minOriginal: Math.min(...originals),
      maxOriginal: Math.max(...originals),
    }
  }

  const sale = calcSalePrice(product.price, product.discount_zhe)
  return {
    min: sale,
    max: sale,
    minOriginal: product.price,
    maxOriginal: product.price,
  }
}

/** 無規格：商品特價；有規格：區間最低特價（列表預設） */
export function getProductSalePrice(product: PricedProduct): number {
  return getProductPriceRange(product).min
}

export function hasProductDiscount(product: PricedProduct): boolean {
  const range = getProductPriceRange(product)
  return range.min < range.minOriginal || range.max < range.maxOriginal
}

/** 折扣顯示，如 8 折 */
export function formatDiscountZheLabel(discountZhe: number): string {
  const label =
    discountZhe % 1 === 0
      ? String(discountZhe)
      : discountZhe.toFixed(1).replace(/\.0$/, '')
  return `${label} 折`
}

export function formatPriceRangeLabel(min: number, max: number): string {
  if (min === max) return `NT$ ${min.toLocaleString()}`
  return `NT$ ${min.toLocaleString()} – ${max.toLocaleString()}`
}
