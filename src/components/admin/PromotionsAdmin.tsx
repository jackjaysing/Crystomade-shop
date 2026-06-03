import { useState } from 'react'
import { CouponAdmin } from './CouponAdmin'
import { GiftCouponAdmin } from './GiftCouponAdmin'
import { RaffleAdmin } from './RaffleAdmin'

type PromotionsSubTab = 'coupons' | 'gift_coupons' | 'raffles'

interface PromotionsAdminProps {
  enabled?: boolean
}

/** 後台：優惠活動（優惠券 + 抽獎） */
export function PromotionsAdmin({ enabled = true }: PromotionsAdminProps) {
  const [subTab, setSubTab] = useState<PromotionsSubTab>('coupons')

  return (
    <div>
      <nav
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="優惠活動分類"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'coupons'}
          onClick={() => setSubTab('coupons')}
          className={`rounded-full px-4 py-2 text-sm tracking-wide transition ${
            subTab === 'coupons'
              ? 'bg-amber-glow/20 text-amber-glow'
              : 'border border-white/15 text-white/50 hover:text-white/80'
          }`}
        >
          優惠券
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'gift_coupons'}
          onClick={() => setSubTab('gift_coupons')}
          className={`rounded-full px-4 py-2 text-sm tracking-wide transition ${
            subTab === 'gift_coupons'
              ? 'bg-amber-glow/20 text-amber-glow'
              : 'border border-white/15 text-white/50 hover:text-white/80'
          }`}
        >
          禮物券
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'raffles'}
          onClick={() => setSubTab('raffles')}
          className={`rounded-full px-4 py-2 text-sm tracking-wide transition ${
            subTab === 'raffles'
              ? 'bg-amber-glow/20 text-amber-glow'
              : 'border border-white/15 text-white/50 hover:text-white/80'
          }`}
        >
          抽獎
        </button>
      </nav>

      {subTab === 'coupons' && <CouponAdmin enabled={enabled} />}
      {subTab === 'gift_coupons' && <GiftCouponAdmin enabled={enabled} />}
      {subTab === 'raffles' && <RaffleAdmin enabled={enabled} />}
    </div>
  )
}
