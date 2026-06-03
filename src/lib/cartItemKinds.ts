import type { CartItem } from './types'

export function isPointRedemptionItem(item: CartItem): boolean {
  return item.kind === 'point_redemption' || item.cartItemKey.startsWith('point::')
}

export function isRaffleGiftItem(item: CartItem): boolean {
  return item.kind === 'raffle_gift' || item.cartItemKey.startsWith('gift::')
}

export function isPaidCartItem(item: CartItem): boolean {
  return !isPointRedemptionItem(item) && !isRaffleGiftItem(item)
}

export function buildPointCartItemKey(pointProductId: string): string {
  return `point::${pointProductId}`
}

export function buildRaffleGiftCartItemKey(memberCouponId: string): string {
  return `gift::${memberCouponId}`
}
