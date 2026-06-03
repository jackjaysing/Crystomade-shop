import type { CouponType } from '../lib/types'

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  fixed_discount: '純折抵',
  percent_discount: '純打折',
  gift: '禮物券',
}

export const COUPON_TYPE_DESCRIPTIONS: Record<CouponType, string> = {
  fixed_discount: '滿指定金額折抵固定金額',
  percent_discount: '滿指定金額享折扣（折）',
  gift: '滿指定金額贈送禮品（不折價）',
}
