import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { CartItemSizeEditor } from '../components/cart/CartItemSizeEditor'
import { OrderSuccessModal } from '../components/cart/OrderSuccessModal'
import { CheckoutCouponSelect } from '../components/checkout/CheckoutCouponSelect'
import { CheckoutLoginGate } from '../components/checkout/CheckoutLoginGate'
import { CheckoutPointsDiscount } from '../components/checkout/CheckoutPointsDiscount'
import { calcCouponDiscount } from '../lib/couponCalculation'
import { fetchMemberAvailableCoupons, redeemMemberCouponAtCheckout } from '../lib/api/coupons'
import { CheckoutMemberSection } from '../components/member/CheckoutMemberSection'
import { calcDiscountNtdFromPoints, clampPointsForDiscount } from '../lib/pointsCalculation'
import { isPointRedemptionItem, isRaffleGiftItem } from '../lib/cartItemKinds'
import {
  cartHasRaffleGiftBase,
  RAFFLE_GIFT_REQUIRES_BASE_MESSAGE,
} from '../lib/cartCheckoutRules'
import { CVS_BRANDS } from '../constants/cvs'
import { FREE_SHIPPING_THRESHOLD } from '../constants/shipping'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useCartAvailability } from '../hooks/useCartAvailability'
import { profileToOrderPrefill, syncMemberProfileFromCheckout } from '../lib/api/members'
import { createOrdersFromCart } from '../lib/api/orders'
import { validateOrderForm } from '../lib/normalizeOrder'
import type { OrderFormData } from '../lib/types'
import { cartItemPhotoAlt } from '../lib/imageAlt'
import { GlassPanel } from '../components/ui/GlassPanel'
import { MetalDivider } from '../components/ui/MetalDivider'

const emptyForm: OrderFormData = {
  buyer_name: '',
  line_name: '',
  phone: '',
  cvs_brand: '7-11',
  cvs_store: '',
}

/** 結帳頁：購物車明細 + 運費 + 收件表單 */
export function CheckoutPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const { items, clearCart } = useCart()
  const {
    resolvedItems,
    checkoutItemCount,
    subtotal,
    shippingFee,
    grandTotal,
    hasSnatchedItems,
    loading,
    refresh,
  } = useCartAvailability({ enabled: true })

  const [form, setForm] = useState<OrderFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  )
  const [showSuccess, setShowSuccess] = useState(false)
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null)
  const [memberCoupons, setMemberCoupons] = useState<
    Awaited<ReturnType<typeof fetchMemberAvailableCoupons>>
  >([])

  useEffect(() => {
    if (!user?.id) {
      setMemberCoupons([])
      setSelectedCouponId(null)
      return
    }
    void fetchMemberAvailableCoupons(user.id).then(setMemberCoupons)
  }, [user?.id])

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        ...profileToOrderPrefill(profile),
        cvs_brand: prev.cvs_brand,
        cvs_store: prev.cvs_store,
      }))
    }
  }, [profile?.id])

  if (items.length === 0 && !showSuccess) {
    return <Navigate to="/products" replace />
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center pt-28 text-white/40">
        載入中…
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <CheckoutLoginGate
        cartItemCount={items.length}
        onAuthSuccess={() => void refreshProfile()}
      />
    )
  }

  const raffleGiftBaseOk = cartHasRaffleGiftBase(items)
  const canCheckout = checkoutItemCount > 0 && raffleGiftBaseOk
  const hasPointRedemption = items.some(isPointRedemptionItem)
  const redemptionPointsNeeded = items
    .filter(isPointRedemptionItem)
    .reduce((s, i) => s + (i.requiredPoints ?? 0) * i.quantity, 0)
  const clampedPointsToUse = profile
    ? clampPointsForDiscount(
        pointsToUse,
        subtotal,
        profile.points,
        redemptionPointsNeeded
      )
    : 0
  const pointsDiscountNtd = calcDiscountNtdFromPoints(clampedPointsToUse)
  const selectedCoupon = memberCoupons.find((c) => c.id === selectedCouponId) ?? null
  const couponPreview =
    selectedCoupon && subtotal > 0
      ? calcCouponDiscount(subtotal, selectedCoupon)
      : null
  const couponDiscountNtd = couponPreview?.discountNtd ?? 0
  const payableTotal = Math.max(
    0,
    grandTotal - pointsDiscountNtd - couponDiscountNtd
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!user?.id || !profile) {
      setMessage({ type: 'err', text: '請先登入會員後再結帳' })
      return
    }

    if (!canCheckout) {
      setMessage({
        type: 'err',
        text: !raffleGiftBaseOk
          ? RAFFLE_GIFT_REQUIRES_BASE_MESSAGE
          : '購物車內已無可結帳商品，請返回選購其他典藏。',
      })
      return
    }

    const validationError = validateOrderForm(form)
    if (validationError) {
      setMessage({ type: 'err', text: validationError })
      return
    }

    if (user && profile) {
      const totalPointsNeeded = clampedPointsToUse + redemptionPointsNeeded
      if (totalPointsNeeded > profile.points) {
        setMessage({ type: 'err', text: '點數不足，請調整折抵或兌換品項' })
        return
      }
      if (selectedCouponId && !couponPreview) {
        setMessage({ type: 'err', text: '所選優惠券無法套用於本筆訂單' })
        return
      }
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const latest = await refresh()
      if (!latest || latest.checkoutItems.length === 0) {
        throw new Error('部分商品剛被搶先收藏，已無可結帳品項，請返回購物車確認。')
      }

      const createdOrders = await createOrdersFromCart(
        latest.checkoutItems,
        form,
        latest.shippingFee,
        user.id,
        clampedPointsToUse
      )

      const checkoutId = createdOrders[0]?.checkout_id
      if (selectedCouponId && checkoutId && subtotal > 0) {
        await redeemMemberCouponAtCheckout(
          selectedCouponId,
          checkoutId,
          subtotal
        )
      }

      await syncMemberProfileFromCheckout(user.id, form.buyer_name, form.phone)
      await refreshProfile()
      clearCart()
      setPointsToUse(0)
      setSelectedCouponId(null)
      setForm(emptyForm)
      setSuccessOrderNumber(createdOrders[0]?.order_number ?? null)
      setShowSuccess(true)
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : '送出失敗，請稍後再試',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-6">
        <section aria-labelledby="checkout-heading">
        <p className="text-xs tracking-[0.4em] text-amber-glow/60">CHECKOUT</p>
        <h1 id="checkout-heading" className="mt-2 font-display text-4xl text-white">確認訂單</h1>

        <GlassPanel className="mt-8 p-6 sm:p-8">
          <h2 className="text-sm tracking-widest text-white/50">訂購明細</h2>

          {loading && resolvedItems.length === 0 && items.length > 0 && (
            <p className="mt-3 text-xs text-white/40">正在確認最新庫存…</p>
          )}

          {hasSnatchedItems && !loading && (
            <p className="mt-3 rounded-lg border border-red-400/20 bg-red-950/20 px-3 py-2 text-xs text-red-300/90">
              部分商品已被他人搶先收藏，以下標示品項不計入結帳金額。
            </p>
          )}

          {!raffleGiftBaseOk && (
            <p className="mt-3 rounded-lg border border-amber-glow/30 bg-amber-glow/10 px-3 py-2 text-xs text-amber-glow/90">
              {RAFFLE_GIFT_REQUIRES_BASE_MESSAGE}
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {resolvedItems.map(
              ({ item, checkoutQuantity, isFullySnatched, snatchedQuantity }) => (
                <li
                  key={item.cartItemKey}
                  className={`flex items-center gap-4 rounded-lg border p-3 ${
                    isFullySnatched
                      ? 'border-white/5 bg-white/[0.01] opacity-60'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={item.image_url}
                      alt={cartItemPhotoAlt(
                        item.name,
                        isRaffleGiftItem(item)
                          ? 'gift'
                          : isPointRedemptionItem(item)
                            ? 'point'
                            : 'product'
                      )}
                      className={`h-16 w-16 rounded-lg object-cover ${
                        isFullySnatched ? 'grayscale' : ''
                      }`}
                    />
                    {isFullySnatched && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-void/60 px-0.5 text-center text-[9px] leading-tight text-red-300">
                        已被搶先收藏
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        isFullySnatched ? 'text-white/50 line-through' : 'text-white'
                      }`}
                    >
                      {item.name}
                    </p>
                    <CartItemSizeEditor
                      cartItemKey={item.cartItemKey}
                      selectedSize={item.selectedSize}
                      disabled={isFullySnatched}
                    />
                    {isFullySnatched ? (
                      <p className="mt-0.5 text-xs text-red-300/80">
                        該物品已被搶先收藏
                      </p>
                    ) : isRaffleGiftItem(item) ? (
                      <p className="mt-0.5 text-xs text-amber-glow/80">
                        抽獎禮物券 · 免費兌換
                      </p>
                    ) : isPointRedemptionItem(item) ? (
                      <p className="mt-0.5 text-xs text-amber-glow/80">
                        點數兌換 · {item.requiredPoints ?? 0} 點 × {checkoutQuantity}
                      </p>
                    ) : (
                      <>
                        <p className="mt-0.5 text-xs text-white/40">
                          NT$ {item.price.toLocaleString()} × {checkoutQuantity}
                          {snatchedQuantity > 0 && (
                            <span className="ml-1 text-red-300/70">
                              （{snatchedQuantity} 件已被搶先收藏）
                            </span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                  {!isFullySnatched && (
                    <p className="shrink-0 text-sm text-amber-glow">
                      {isPointRedemptionItem(item) || isRaffleGiftItem(item)
                        ? 'NT$ 0'
                        : `NT$ ${(item.price * checkoutQuantity).toLocaleString()}`}
                    </p>
                  )}
                </li>
              )
            )}
          </ul>

          <MetalDivider />

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-white/60">
              <span>{hasPointRedemption ? '付費商品小計' : '商品小計'}</span>
              <span>NT$ {subtotal.toLocaleString()}</span>
            </div>
            {hasPointRedemption && (
              <p className="text-[11px] text-white/35">
                兌換商品為 NT$0，不可折抵運費；僅兌換時仍需支付運費
              </p>
            )}
            <div className="flex justify-between text-white/60">
              <span>
                運費
                {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                  <span className="ml-1 text-xs text-white/30">
                    （未滿 {FREE_SHIPPING_THRESHOLD} 元）
                  </span>
                )}
              </span>
              <span>
                {shippingFee === 0 && subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span className="text-emerald-400">免運</span>
                ) : shippingFee === 0 ? (
                  '—'
                ) : (
                  `NT$ ${shippingFee.toLocaleString()}`
                )}
              </span>
            </div>
            {profile && pointsDiscountNtd > 0 && (
              <div className="flex justify-between text-emerald-400/90">
                <span>點數折抵</span>
                <span>- NT$ {pointsDiscountNtd.toLocaleString()}</span>
              </div>
            )}
            {profile && couponPreview && couponDiscountNtd > 0 && (
              <div className="flex justify-between text-emerald-400/90">
                <span>優惠券</span>
                <span>- NT$ {couponDiscountNtd.toLocaleString()}</span>
              </div>
            )}
            {profile && couponPreview?.giftNote && (
              <p className="text-xs text-amber-glow/80">
                滿額贈禮：{couponPreview.giftNote}（隨訂單出貨附贈）
              </p>
            )}
            <div className="flex justify-between border-t border-white/10 pt-3 text-lg text-white">
              <span>應付總額</span>
              <span className="font-medium text-amber-glow">
                NT$ {payableTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {profile && user?.id && (
            <div className="mt-4">
              <CheckoutCouponSelect
                userId={user.id}
                productSubtotal={subtotal}
                selectedId={selectedCouponId}
                onSelect={setSelectedCouponId}
              />
            </div>
          )}

          {profile && subtotal > 0 && (
            <div className="mt-4">
              <CheckoutPointsDiscount
                memberPoints={profile.points}
                productSubtotal={subtotal}
                pointsToUse={pointsToUse}
                pointsReservedForRedemption={redemptionPointsNeeded}
                onPointsChange={setPointsToUse}
              />
            </div>
          )}
        </GlassPanel>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <CheckoutMemberSection />

          <GlassPanel className="p-6 sm:p-8">
            <p className="text-xs tracking-widest text-white/40">填寫取件資訊（超商宅配）</p>

            <div className="mt-4 space-y-4">
              <input
                required
                placeholder="姓名 *"
                value={form.buyer_name}
                onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
                className="input-field"
              />

              <input
                placeholder="Line 名稱（選填）"
                value={form.line_name}
                onChange={(e) => setForm({ ...form, line_name: e.target.value })}
                className="input-field"
              />

              <input
                required
                type="tel"
                placeholder="聯絡電話 *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />

              <div>
                <p className="mb-2 text-xs text-white/50">收件超商 *</p>
                <div className="flex flex-wrap gap-2">
                  {CVS_BRANDS.map((brand) => (
                    <label
                      key={brand.id}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                        form.cvs_brand === brand.id
                          ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                          : 'border-white/10 text-white/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cvs_brand"
                        className="sr-only"
                        checked={form.cvs_brand === brand.id}
                        onChange={() => setForm({ ...form, cvs_brand: brand.id })}
                      />
                      {brand.label}
                    </label>
                  ))}
                </div>
              </div>

              <input
                required
                placeholder="收件門市（店名或店號）*"
                value={form.cvs_store}
                onChange={(e) => setForm({ ...form, cvs_store: e.target.value })}
                className="input-field"
              />
              <p className="text-[11px] text-white/35">
                例：7-11 信義門市、全家 南京復興店，或超商地圖上的店號
              </p>
            </div>

            {message && (
              <p
                className={`mt-4 text-sm ${
                  message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !canCheckout || loading}
              className="mt-6 w-full rounded-lg bg-amber-glow/90 py-4 text-sm font-medium tracking-widest text-void transition hover:bg-amber-glow disabled:opacity-50"
            >
              {submitting ? '送出中…' : canCheckout ? '確認下單' : '無可結帳商品'}
            </button>
          </GlassPanel>
        </form>
        </section>
      </div>

      {showSuccess && <OrderSuccessModal orderNumber={successOrderNumber} />}
    </div>
  )
}
