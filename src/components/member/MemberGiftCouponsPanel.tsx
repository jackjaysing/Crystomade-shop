import { useEffect, useState } from 'react'
import { fetchMemberCouponHistory } from '../../lib/api/coupons'
import type { MemberCouponWithDefinition } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
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
    <GlassPanel className="mt-6 p-6 sm:p-8">
      <h2 className="text-sm tracking-widest text-white/50">我的禮物券</h2>
      <p className="mt-1 text-xs text-white/35">
        抽獎獲得之獎品，可兌換至購物車後與其他商品併單出貨；收到禮物券後開始倒數{' '}
        {RAFFLE_GIFT_VALID_DAYS} 日
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-white/35">載入中…</p>
      ) : giftCoupons.length === 0 ? (
        <p className="mt-4 text-sm text-white/35">
          尚無禮物券，中獎後會顯示於此。
        </p>
      ) : (
        <MemberCouponList
          items={giftCoupons}
          variant="gift"
          onReload={reload}
        />
      )}
      <p className="mt-4 text-[11px] text-white/30">
        {RAFFLE_GIFT_REQUIRES_BASE_MESSAGE}
      </p>
    </GlassPanel>
  )
}
