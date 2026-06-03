import { useEffect, useState } from 'react'
import { fetchMemberAvailableCoupons } from '../../lib/api/coupons'
import {
  calcCouponDiscount,
  formatCouponRuleSummary,
} from '../../lib/couponCalculation'
import { getMemberCouponTypeLabel } from '../../constants/coupons'
import type { MemberCouponWithDefinition } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface CheckoutCouponSelectProps {
  userId: string
  productSubtotal: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/** 結帳：選擇會員優惠券 */
export function CheckoutCouponSelect({
  userId,
  productSubtotal,
  selectedId,
  onSelect,
}: CheckoutCouponSelectProps) {
  const [coupons, setCoupons] = useState<MemberCouponWithDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchMemberAvailableCoupons(userId)
      .then((rows) => {
        if (!cancelled) setCoupons(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <p className="text-xs text-white/40">載入可用優惠券…</p>
    )
  }

  if (coupons.length === 0) {
    return (
      <p className="text-xs text-white/40">
        目前沒有可用的優惠券，可至會員中心查看。
      </p>
    )
  }

  return (
    <GlassPanel className="border border-white/10 p-4">
      <p className="text-xs tracking-widest text-white/50">優惠券</p>
      <p className="mt-0.5 text-[11px] text-white/35">
        不含抽獎禮物券（請至會員中心「我的禮物券」）
      </p>
      <ul className="mt-3 space-y-2">
        <li>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 px-3 py-2.5 transition hover:border-amber-glow/30">
            <input
              type="radio"
              name="checkout-coupon"
              className="mt-1"
              checked={selectedId === null}
              onChange={() => onSelect(null)}
            />
            <span className="text-sm text-white/60">不使用優惠券</span>
          </label>
        </li>
        {coupons.map((mc) => {
          const preview = calcCouponDiscount(productSubtotal, mc)
          const eligible = preview != null
          return (
            <li key={mc.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                  eligible
                    ? selectedId === mc.id
                      ? 'border-amber-glow/50 bg-amber-glow/10'
                      : 'border-white/10 hover:border-amber-glow/30'
                    : 'cursor-not-allowed border-white/5 opacity-50'
                }`}
              >
                <input
                  type="radio"
                  name="checkout-coupon"
                  className="mt-1"
                  disabled={!eligible}
                  checked={selectedId === mc.id}
                  onChange={() => onSelect(mc.id)}
                />
                <span className="min-w-0">
                  <span className="block text-sm text-white/90">
                    {mc.coupon.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-amber-glow/80">
                    {getMemberCouponTypeLabel(mc.coupon)} ·{' '}
                    {formatCouponRuleSummary(mc.coupon)}
                  </span>
                  {eligible && preview && (
                    <span className="mt-1 block text-xs text-emerald-400/90">
                      本單可套用：{preview.label}
                    </span>
                  )}
                  {!eligible && (
                    <span className="mt-1 block text-xs text-white/40">
                      未達滿額門檻（需付費商品小計 NT$
                      {mc.coupon.min_purchase_amount.toLocaleString()}）
                    </span>
                  )}
                  {mc.expires_at && (
                    <span className="mt-0.5 block text-[11px] text-white/35">
                      有效至{' '}
                      {new Date(mc.expires_at).toLocaleDateString('zh-TW')}
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </GlassPanel>
  )
}
