import type { CartItem } from './types'

export function isPointRedemptionItem(item: CartItem): boolean {
  return item.kind === 'point_redemption' || item.cartItemKey.startsWith('point::')
}

export function isPaidCartItem(item: CartItem): boolean {
  return !isPointRedemptionItem(item)
}

export function buildPointCartItemKey(pointProductId: string): string {
  return `point::${pointProductId}`
}
