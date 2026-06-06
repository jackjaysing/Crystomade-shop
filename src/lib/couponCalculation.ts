import type { Coupon, MemberCouponWithDefinition } from './types'

export interface CouponDiscountResult {
  discountNtd: number
  giftNote: string | null
  label: string
}

/** 依付費商品小計計算優惠券折抵（禮物券折 0 元） */
export function calcCouponDiscount(
  productSubtotal: number,
  memberCoupon: MemberCouponWithDefinition
): CouponDiscountResult | null {
  const coupon = memberCoupon.coupon
  if (memberCoupon.status !== 'available') return null
  if (productSubtotal < coupon.min_purchase_amount) return null

  if (coupon.coupon_type === 'gift') {
    const gift = coupon.gift_description?.trim() || coupon.title
    return {
      discountNtd: 0,
      giftNote: gift,
      label: `滿額贈禮：${gift}`,
    }
  }

  if (coupon.coupon_type === 'fixed_discount') {
    const amount = Math.max(0, coupon.discount_amount ?? 0)
    const discountNtd = Math.min(amount, productSubtotal)
    return {
      discountNtd,
      giftNote: null,
      label: `折抵 NT$${discountNtd.toLocaleString()}`,
    }
  }

  if (coupon.coupon_type === 'percent_discount') {
    const zhe = coupon.discount_zhe
    if (zhe == null || zhe <= 0 || zhe >= 10) return null
    const discountedSubtotal = Math.floor(
      (productSubtotal * zhe) / 10
    )
    const discountNtd = Math.max(0, productSubtotal - discountedSubtotal)
    return {
      discountNtd,
      giftNote: null,
      label: `${zhe % 1 === 0 ? zhe : zhe.toFixed(1)} 折（折 NT$${discountNtd.toLocaleString()}）`,
    }
  }

  return null
}

export function formatCouponRuleSummary(coupon: Coupon): string {
  const min = coupon.min_purchase_amount
  const minLabel =
    min > 0 ? `滿 NT$${min.toLocaleString()}` : '無門檻'

  if (coupon.coupon_type === 'fixed_discount') {
    return `${minLabel} 折 NT$${(coupon.discount_amount ?? 0).toLocaleString()}`
  }
  if (coupon.coupon_type === 'percent_discount') {
    const zhe = coupon.discount_zhe ?? 0
    const zheLabel = zhe % 1 === 0 ? String(zhe) : zhe.toFixed(1)
    return `${minLabel} 享 ${zheLabel} 折`
  }
  return `${minLabel} 贈 ${coupon.gift_description?.trim() || coupon.title}`
}

const MS_PER_DAY = 86_400_000

/** 距到期日剩餘天數（已過期為 0；無到期日為 null） */
export function couponDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / MS_PER_DAY)
}

export function formatMemberCouponExpiryCountdown(
  memberCoupon: Pick<MemberCouponWithDefinition, 'expires_at' | 'status'>
): string | null {
  if (!memberCoupon.expires_at || memberCoupon.status === 'used') return null

  const expiryLabel = new Date(memberCoupon.expires_at).toLocaleDateString(
    'zh-TW'
  )
  const days = couponDaysRemaining(memberCoupon.expires_at)
  const expired =
    days === 0 ||
    memberCoupon.status === 'expired' ||
    new Date(memberCoupon.expires_at).getTime() < Date.now()

  if (expired) {
    return `已於 ${expiryLabel} 過期`
  }

  return `剩餘 ${days} 天（至 ${expiryLabel}）`
}

export function isMemberCouponExpired(
  memberCoupon: Pick<MemberCouponWithDefinition, 'expires_at' | 'status'>
): boolean {
  if (memberCoupon.status === 'expired' || memberCoupon.status === 'used') {
    return memberCoupon.status === 'expired'
  }
  if (!memberCoupon.expires_at) return false
  return new Date(memberCoupon.expires_at).getTime() < Date.now()
}
