import type { Coupon, CouponType } from '../lib/types'

/** 抽獎獎品：兌換至購物車的禮物券 */
export function isCartRaffleGiftCoupon(coupon: Coupon): boolean {
  return coupon.coupon_type === 'gift' && coupon.redeem_mode === 'cart'
}

/** 會員中心顯示用類型標籤（與抽獎禮物券分開） */
export function getMemberCouponTypeLabel(coupon: Coupon): string {
  if (isCartRaffleGiftCoupon(coupon)) return '禮物券'
  if (coupon.coupon_type === 'gift') return '滿額贈禮'
  return COUPON_TYPE_LABELS[coupon.coupon_type]
}

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  fixed_discount: '純折抵',
  percent_discount: '純打折',
  gift: '滿額贈禮',
}

export const COUPON_TYPE_DESCRIPTIONS: Record<CouponType, string> = {
  fixed_discount: '滿指定金額折抵固定金額',
  percent_discount: '滿指定金額享折扣（折）',
  gift: '滿指定金額贈送禮品（不折價）',
}
