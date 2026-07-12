import type { Product } from './types'

const UUID_PATTERN =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** 商品名稱轉 URL 片段（保留中文，移除不適合路徑的字元） */
export function slugifyProductName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\/\\?#&%+]+/g, '')
    .slice(0, 80)
}

/** 商品詳情頁 slug：`名稱-uuid` */
export function productSlug(product: Pick<Product, 'id' | 'name'>): string {
  const namePart = slugifyProductName(product.name)
  return namePart ? `${namePart}-${product.id}` : product.id
}

/** 商品詳情頁路徑 */
export function productDetailPath(product: Pick<Product, 'id' | 'name'>): string {
  return `/products/${encodeURIComponent(productSlug(product))}`
}

/** 五行平衡手串客戶配置頁路徑 */
export function productConfigurePath(product: Pick<Product, 'id' | 'name'>): string {
  return `${productDetailPath(product)}/configure`
}

/** 從路由 slug 解析商品 UUID */
export function parseProductIdFromSlug(slug: string): string {
  const decoded = decodeURIComponent(slug.trim())
  const match = decoded.match(UUID_PATTERN)
  if (match) return match[1]
  return decoded
}

/** 在已載入列表中依 slug 找商品 */
export function findProductBySlug(
  products: Product[],
  slug: string
): Product | undefined {
  const id = parseProductIdFromSlug(slug)
  return products.find((product) => product.id === id)
}
