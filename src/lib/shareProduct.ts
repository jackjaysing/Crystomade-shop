import { SITE_NAME } from '../constants/siteMeta'
import { incrementProductShare } from './api/analytics'
import { copyToClipboard } from './copyToClipboard'
import { productDetailPath } from './productSlug'
import { isSupabaseConfigured } from './supabase'
import { absoluteUrl } from './siteMeta'
import type { Product } from './types'

const SHARE_DEBOUNCE_MS = 2000
const recentProductShares = new Map<string, number>()

export type ProductShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** 商品詳情頁完整分享網址 */
export function getProductShareUrl(product: Pick<Product, 'id' | 'name'>): string {
  return absoluteUrl(productDetailPath(product))
}

/** 分享文案（LINE、複製連結用） */
export function getProductShareText(
  product: Pick<Product, 'name' | 'description'>
): string {
  const snippet = product.description.trim().slice(0, 80)
  const intro = snippet ? `【${product.name}】${snippet}…` : `【${product.name}】`
  return `${intro}\n${SITE_NAME}`
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
  const title = `${product.name}｜${SITE_NAME}`

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
