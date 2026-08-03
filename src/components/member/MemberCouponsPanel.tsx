import { useEffect, useState } from 'react'
import { fetchMemberCouponHistory } from '../../lib/api/coupons'
import type { MemberCouponWithDefinition } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { AccountSectionHeader } from '../account/AccountSectionHeader'
import {
  MemberCouponList,
  splitMemberCoupons,
} from './memberCouponShared'

interface MemberCouponsPanelProps {
  userId: string
}

/** 會員中心：優惠券（折抵／打折／滿額贈禮，不含抽獎禮物券） */
export function MemberCouponsPanel({ userId }: MemberCouponsPanelProps) {
  const [discountCoupons, setDiscountCoupons] = useState<
    MemberCouponWithDefinition[]
  >([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchMemberCouponHistory(userId)
      .then((rows) => {
        if (!cancelled) {
          setDiscountCoupons(splitMemberCoupons(rows).discountCoupons)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, reloadKey])

  return (
    <GlassPanel className="p-6 sm:p-8">
      <AccountSectionHeader
        eyebrow="COUPONS"
        title="我的優惠券"
        lead="結帳時可選用，含折抵、打折與滿額贈禮"
      />
      {loading ? (
        <p className="mt-5 text-sm text-white/45">載入中…</p>
      ) : discountCoupons.length === 0 ? (
        <p className="mt-5 text-sm text-white/45">尚無優惠券，請留意活動發放。</p>
      ) : (
        <MemberCouponList
          items={discountCoupons}
          variant="discount"
          onReload={reload}
        />
      )}
    </GlassPanel>
  )
}
