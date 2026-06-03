import { useEffect, useState } from 'react'
import { fetchMemberCouponHistory } from '../../lib/api/coupons'
import { formatCouponRuleSummary } from '../../lib/couponCalculation'
import { COUPON_TYPE_LABELS } from '../../constants/coupons'
import type { MemberCouponWithDefinition } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface MemberCouponsPanelProps {
  userId: string
}

function statusLabel(
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
  return { text: '可使用', className: 'text-emerald-400' }
}

/** 會員中心：我的優惠券 */
export function MemberCouponsPanel({ userId }: MemberCouponsPanelProps) {
  const [coupons, setCoupons] = useState<MemberCouponWithDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchMemberCouponHistory(userId)
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

  return (
    <GlassPanel className="mt-6 p-6 sm:p-8">
      <h2 className="text-sm tracking-widest text-white/50">我的優惠券</h2>
      {loading ? (
        <p className="mt-4 text-sm text-white/35">載入中…</p>
      ) : coupons.length === 0 ? (
        <p className="mt-4 text-sm text-white/35">尚無優惠券，請留意活動發放。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {coupons.map((mc) => {
            const st = statusLabel(mc)
            return (
              <li
                key={mc.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white/90">{mc.coupon.title}</p>
                    <p className="mt-0.5 text-xs text-amber-glow/80">
                      {COUPON_TYPE_LABELS[mc.coupon.coupon_type]} ·{' '}
                      {formatCouponRuleSummary(mc.coupon)}
                    </p>
                    {mc.coupon.description && (
                      <p className="mt-1 text-xs text-white/45">
                        {mc.coupon.description}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${st.className}`}>
                    {st.text}
                  </span>
                </div>
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
      )}
    </GlassPanel>
  )
}
