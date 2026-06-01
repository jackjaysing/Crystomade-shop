import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { OrderSuccessModal } from '../components/cart/OrderSuccessModal'
import { CVS_BRANDS } from '../constants/cvs'
import { FREE_SHIPPING_THRESHOLD } from '../constants/shipping'
import { useCart } from '../contexts/CartContext'
import { useCartAvailability } from '../hooks/useCartAvailability'
import { createOrdersFromCart } from '../lib/api/orders'
import { validateOrderForm } from '../lib/normalizeOrder'
import type { OrderFormData } from '../lib/types'
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

  if (items.length === 0 && !showSuccess) {
    return <Navigate to="/products" replace />
  }

  const canCheckout = checkoutItemCount > 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!canCheckout) {
      setMessage({ type: 'err', text: '購物車內已無可結帳商品，請返回選購其他典藏。' })
      return
    }

    const validationError = validateOrderForm(form)
    if (validationError) {
      setMessage({ type: 'err', text: validationError })
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const latest = await refresh()
      if (!latest || latest.checkoutItems.length === 0) {
        throw new Error('部分商品剛被搶先收藏，已無可結帳品項，請返回購物車確認。')
      }

      await createOrdersFromCart(
        latest.checkoutItems,
        form,
        latest.shippingFee
      )
      clearCart()
      setForm(emptyForm)
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
        <p className="text-xs tracking-[0.4em] text-amber-glow/60">CHECKOUT</p>
        <h1 className="mt-2 font-display text-4xl text-white">確認訂單</h1>

        <GlassPanel className="mt-8 p-6 sm:p-8">
          <h2 className="text-sm tracking-widest text-white/50">訂購明細</h2>

          {loading && (
            <p className="mt-3 text-xs text-white/40">正在確認最新庫存…</p>
          )}

          {hasSnatchedItems && !loading && (
            <p className="mt-3 rounded-lg border border-red-400/20 bg-red-950/20 px-3 py-2 text-xs text-red-300/90">
              部分商品已被他人搶先收藏，以下標示品項不計入結帳金額。
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {resolvedItems.map(
              ({ item, checkoutQuantity, isFullySnatched, snatchedQuantity }) => (
                <li
                  key={item.productId}
                  className={`flex items-center gap-4 rounded-lg border p-3 ${
                    isFullySnatched
                      ? 'border-white/5 bg-white/[0.01] opacity-60'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={item.image_url}
                      alt=""
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
                    {isFullySnatched ? (
                      <p className="mt-0.5 text-xs text-red-300/80">
                        該物品已被搶先收藏
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
                      NT$ {(item.price * checkoutQuantity).toLocaleString()}
                    </p>
                  )}
                </li>
              )
            )}
          </ul>

          <MetalDivider />

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-white/60">
              <span>商品小計</span>
              <span>NT$ {subtotal.toLocaleString()}</span>
            </div>
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
                {shippingFee === 0 && subtotal > 0 ? (
                  <span className="text-emerald-400">免運</span>
                ) : shippingFee === 0 ? (
                  '—'
                ) : (
                  `NT$ ${shippingFee.toLocaleString()}`
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-lg text-white">
              <span>應付總額</span>
              <span className="font-medium text-amber-glow">
                NT$ {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </GlassPanel>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
      </div>

      {showSuccess && <OrderSuccessModal onClose={() => setShowSuccess(false)} />}
    </div>
  )
}
