import { getProductSalePrice } from './productPricing'
import type { Product } from './types'

/** 新上架優先（created_at 較新者在前） */
function compareByNewestFirst(a: Product, b: Product): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

/** 後台手動排序優先，相同則新上架優先 */
function compareBySortOrderThenNewest(a: Product, b: Product): number {
  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order
  }
  return compareByNewestFirst(a, b)
}

/** 依價格排序（特價）；相同則 sort_order → 新上架 */
function compareByPrice(
  a: Product,
  b: Product,
  mode: 'price_asc' | 'price_desc'
): number {
  const aPrice = getProductSalePrice(a)
  const bPrice = getProductSalePrice(b)
  if (aPrice !== bPrice) {
    return mode === 'price_asc' ? aPrice - bPrice : bPrice - aPrice
  }
  return compareBySortOrderThenNewest(a, b)
}

function compareInDefaultMode(a: Product, b: Product): number {
  return compareBySortOrderThenNewest(a, b)
}

/** 前台／後台共用：熱門置頂 → 各區塊內 sort_order → 新上架優先 */
export function compareProducts(a: Product, b: Product): number {
  if (a.is_hot !== b.is_hot) {
    return a.is_hot ? -1 : 1
  }
  return compareBySortOrderThenNewest(a, b)
}

export function sortProducts(products: Product[]): Product[] {
  return [...products].sort(compareProducts)
}

/** 前台商品排序方式 */
export type ProductSortMode = 'default' | 'price_asc' | 'price_desc'

export const PRODUCT_SORT_OPTIONS: {
  id: ProductSortMode
  label: string
}[] = [
  { id: 'default', label: '綜合' },
  { id: 'price_asc', label: '價格低→高' },
  { id: 'price_desc', label: '價格高→低' },
]

function compareWithinGroup(a: Product, b: Product, mode: ProductSortMode): number {
  if (mode === 'price_asc' || mode === 'price_desc') {
    return compareByPrice(a, b, mode)
  }
  return compareInDefaultMode(a, b)
}

export function sortProductsByMode(
  products: Product[],
  mode: ProductSortMode
): Product[] {
  const hot = products.filter((product) => product.is_hot)
  const rest = products.filter((product) => !product.is_hot)

  hot.sort((a, b) => compareWithinGroup(a, b, mode))
  rest.sort((a, b) => compareWithinGroup(a, b, mode))

  return [...hot, ...rest]
}

/** 是否可與相鄰商品交換排序（不可跨熱門／一般區塊） */
export function canSwapProductWithNeighbor(
  products: Product[],
  index: number,
  direction: 'up' | 'down'
): boolean {
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= products.length) return false
  return products[index].is_hot === products[swapIndex].is_hot
}
