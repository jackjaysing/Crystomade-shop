import {
  isPaidCartItem,
  isPointRedemptionItem,
  isRaffleGiftItem,
} from './cartItemKinds'
import type { CartItem } from './types'

export const RAFFLE_GIFT_REQUIRES_BASE_MESSAGE =
  '抽獎禮物券需與付費商品或點數兌換品一同結帳，無法單獨出貨'

/** 有抽獎禮物券時，須同時有付費商品或點數兌換品才可結帳 */
export function cartHasRaffleGiftBase(items: CartItem[]): boolean {
  const hasGift = items.some(isRaffleGiftItem)
  if (!hasGift) return true
  return items.some((i) => isPaidCartItem(i) || isPointRedemptionItem(i))
}
