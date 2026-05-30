import type { Product } from './types'

/** 合併封面與相簿（詳情頁用，封面永遠是第一張） */
export function getProductImages(product: Product): string[] {
  const cover = product.image_url
  const gallery = (product.gallery_urls ?? []).filter(
    (url) => url && url !== cover
  )
  return [cover, ...gallery]
}
