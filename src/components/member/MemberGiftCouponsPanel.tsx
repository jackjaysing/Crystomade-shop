import { useEffect, useState } from 'react'
import { fetchMemberCouponHistory } from '../../lib/api/coupons'
import type { MemberCouponWithDefinition } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { AccountSectionHeader } from '../account/AccountSectionHeader'
import { RAFFLE_GIFT_REQUIRES_BASE_MESSAGE } from '../../lib/cartCheckoutRules'
import { RAFFLE_GIFT_VALID_DAYS } from '../../constants/raffles'
import {
  MemberCouponList,
  splitMemberCoupons,
} from './memberCouponShared'

interface MemberGiftCouponsPanelProps {
  userId: string
}

/** 會員中心：禮物券（抽獎獎品，兌換至購物車） */
export function MemberGiftCouponsPanel({ userId }: MemberGiftCouponsPanelProps) {
  const [giftCoupons, setGiftCoupons] = useState<MemberCouponWithDefinition[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchMemberCouponHistory(userId)
      .then((rows) => {
        if (!cancelled) {
          setGiftCoupons(splitMemberCoupons(rows).giftCoupons)
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
        eyebrow="GIFTS"
        title="我的禮物券"
        lead={`抽獎獎品可兌換至購物車，與其他商品併單出貨；收到後 ${RAFFLE_GIFT_VALID_DAYS} 日內有效。`}
      />
      {loading ? (
        <p className="mt-5 text-sm text-white/45">載入中…</p>
      ) : giftCoupons.length === 0 ? (
        <p className="mt-5 text-sm text-white/45">尚無禮物券，中獎後會顯示於此。</p>
      ) : (
        <MemberCouponList
          items={giftCoupons}
          variant="gift"
          onReload={reload}
        />
      )}
      <p className="mt-5 text-xs leading-relaxed text-white/40">
        {RAFFLE_GIFT_REQUIRES_BASE_MESSAGE}
      </p>
    </GlassPanel>
  )
}
