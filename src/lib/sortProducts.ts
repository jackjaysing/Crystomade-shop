import type { Product } from './types'

/** 前台／後台共用：熱門置頂 → sort_order 小優先 → 新上架優先 */
export function compareProducts(a: Product, b: Product): number {
  if (a.is_hot !== b.is_hot) {
    return a.is_hot ? -1 : 1
  }

  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
  if (mode !== 'default' && a.price !== b.price) {
    return mode === 'price_asc' ? a.price - b.price : b.price - a.price
  }

  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
