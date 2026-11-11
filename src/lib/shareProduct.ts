import { incrementProductShare } from './api/analytics'
import { copyToClipboard } from './copyToClipboard'
import { productSharePath } from './productSlug'
import { isSupabaseConfigured } from './supabase'
import { absoluteUrl } from './siteMeta'
import type { Product } from './types'

const SHARE_DEBOUNCE_MS = 2000
const recentProductShares = new Map<string, number>()

export type ProductShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** 商品分享網址：用 UUID 短連結，避免複製中文路徑時編碼壞掉 */
export function getProductShareUrl(product: Pick<Product, 'id' | 'name'>): string {
  const url = new URL(absoluteUrl(productSharePath(product)))
  url.searchParams.set('og', '2')
  return url.toString()
}

/** 分享文案（LINE、複製連結用）：僅商品名稱 */
export function getProductShareText(
  product: Pick<Product, 'name' | 'description'>
): string {
  return product.name.trim()
}

function recordProductShare(productId: string) {
  if (!isSupabaseConfigured) return

  const now = Date.now()
  const last = recentProductShares.get(productId) ?? 0
  if (now - last < SHARE_DEBOUNCE_MS) return

  recentProductShares.set(productId, now)
  void incrementProductShare(productId)
}

/** 分享商品：支援 Web Share API，否則複製連結 */
export async function shareProduct(product: Product): Promise<ProductShareResult> {
  const url = getProductShareUrl(product)
  const text = getProductShareText(product)
  const title = text

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      recordProductShare(product.id)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  const copied = await copyToClipboard(`${text}\n${url}`)
  if (copied) {
    recordProductShare(product.id)
    return 'copied'
  }
  return 'failed'
}
