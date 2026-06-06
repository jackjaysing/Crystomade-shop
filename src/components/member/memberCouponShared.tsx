import {
  formatCouponRuleSummary,
  formatMemberCouponExpiryCountdown,
  isMemberCouponExpired,
} from '../../lib/couponCalculation'
import {
  getMemberCouponTypeLabel,
  isCartRaffleGiftCoupon,
} from '../../constants/coupons'
import type { MemberCouponWithDefinition } from '../../lib/types'
import { RaffleGiftRedeemButton } from './RaffleGiftRedeemButton'

export function statusLabel(
  mc: MemberCouponWithDefinition
): { text: string; className: string } {
  if (mc.status === 'used') {
    return { text: '已使用', className: 'text-white/45' }
  }
  if (mc.status === 'expired') {
    return { text: '已過期', className: 'text-white/40' }
  }
  if (mc.expires_at && new Date(mc.expires_at).getTime() < Date.now()) {
    return { text: '已過期', className: 'text-white/40' }
  }
  if (mc.status === 'in_cart') {
    return { text: '已放入購物車', className: 'text-amber-glow/90' }
  }
  return { text: '可使用', className: 'text-emerald-400' }
}

function giftRuleSummary(mc: MemberCouponWithDefinition): string {
  const c = mc.coupon
  return c.gift_description?.trim() || c.title
}

interface MemberCouponListProps {
  items: MemberCouponWithDefinition[]
  variant: 'discount' | 'gift'
  onReload: () => void
}

/** 會員優惠券／禮物券列表列 */
export function MemberCouponList({
  items,
  variant,
  onReload,
}: MemberCouponListProps) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((mc) => {
        const st = statusLabel(mc)
        const isGift = variant === 'gift'
        const expiryCountdown = isGift
          ? formatMemberCouponExpiryCountdown(mc)
          : null
        return (
          <li
            key={mc.id}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex gap-3">
                {isGift && mc.coupon.image_url && (
                  <img
                    src={mc.coupon.image_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-medium text-white/90">{mc.coupon.title}</p>
                  <p className="mt-0.5 text-xs text-amber-glow/80">
                    {getMemberCouponTypeLabel(mc.coupon)}
                    {!isGift && (
                      <>
                        {' '}
                        · {formatCouponRuleSummary(mc.coupon)}
                      </>
                    )}
                  </p>
                  {isGift ? (
                    <>
                      <p className="mt-1 text-xs text-white/45">
                        {giftRuleSummary(mc)}
                      </p>
                      {expiryCountdown && (
                        <p
                          className={`mt-1 text-xs font-medium ${
                            isMemberCouponExpired(mc)
                              ? 'text-white/40'
                              : 'text-amber-glow/90'
                          }`}
                        >
                          {expiryCountdown}
                        </p>
                      )}
                    </>
                  ) : (
                    mc.coupon.description && (
                      <p className="mt-1 text-xs text-white/45">
                        {mc.coupon.description}
                      </p>
                    )
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium ${st.className}`}>
                {st.text}
              </span>
            </div>
            {isGift && (
              <RaffleGiftRedeemButton
                memberCoupon={mc}
                onRedeemed={onReload}
                className="mt-3"
              />
            )}
            <p className="mt-2 text-[11px] text-white/35">
              發放：{new Date(mc.issued_at).toLocaleDateString('zh-TW')}
              {mc.expires_at &&
                ` · 有效至 ${new Date(mc.expires_at).toLocaleDateString('zh-TW')}`}
              {mc.used_at &&
                ` · 使用於 ${new Date(mc.used_at).toLocaleDateString('zh-TW')}`}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

export function splitMemberCoupons(rows: MemberCouponWithDefinition[]) {
  const giftCoupons = rows.filter((mc) => isCartRaffleGiftCoupon(mc.coupon))
  const discountCoupons = rows.filter(
    (mc) => !isCartRaffleGiftCoupon(mc.coupon)
  )
  return { discountCoupons, giftCoupons }
}
