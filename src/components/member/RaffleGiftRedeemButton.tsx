import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { redeemGiftCouponToCart } from '../../lib/api/coupons'
import { RAFFLE_GIFT_REQUIRES_BASE_MESSAGE } from '../../lib/cartCheckoutRules'
import type { MemberCouponWithDefinition } from '../../lib/types'

interface RaffleGiftRedeemButtonProps {
  memberCoupon: MemberCouponWithDefinition
  onRedeemed?: () => void
  className?: string
}

/** 將抽獎禮物券兌換至購物車 */
export function RaffleGiftRedeemButton({
  memberCoupon,
  onRedeemed,
  className = '',
}: RaffleGiftRedeemButtonProps) {
  const { user } = useAuth()
  const { addRaffleGift, openCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const canRedeem =
    memberCoupon.status === 'available' &&
    memberCoupon.coupon.redeem_mode === 'cart' &&
    memberCoupon.coupon.coupon_type === 'gift'

  if (!canRedeem) return null

  const handleRedeem = async () => {
    if (!user) return
    setLoading(true)
    setMessage('')
    try {
      const payload = await redeemGiftCouponToCart(memberCoupon.id, user.id)
      addRaffleGift(payload)
      openCart()
      onRedeemed?.()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '兌換失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleRedeem()}
        className="rounded-lg bg-amber-glow/20 px-4 py-2 text-sm text-amber-glow transition hover:bg-amber-glow/30 disabled:opacity-50"
      >
        {loading ? '兌換中…' : '兌換至購物車'}
      </button>
      {message && (
        <p className="mt-1 text-xs text-red-300/90">{message}</p>
      )}
      <p className="mt-1 text-[11px] text-white/35">
        {RAFFLE_GIFT_REQUIRES_BASE_MESSAGE}
      </p>
    </div>
  )
}
