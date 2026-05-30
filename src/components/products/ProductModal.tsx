import { useState, type FormEvent } from 'react'
import { getCategoryLabel } from '../../constants/categories'
import { createOrder } from '../../lib/api/orders'
import type { OrderFormData, Product } from '../../lib/types'
import { ProductImageGallery } from './ProductImageGallery'
import { GlassPanel } from '../ui/GlassPanel'
import { MetalDivider } from '../ui/MetalDivider'

interface ProductModalProps {
  product: Product | null
  onClose: () => void
  onOrderSuccess: () => void
}

const emptyForm: OrderFormData = {
  buyer_name: '',
  phone: '',
  address: '',
}

/** 商品詳情毛玻璃彈窗 + 下單表單 */
export function ProductModal({
  product,
  onClose,
  onOrderSuccess,
}: ProductModalProps) {
  const [form, setForm] = useState<OrderFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  )
  const [showForm, setShowForm] = useState(false)

  if (!product) return null

  const isSold = product.status === 'sold'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSold) return

    setSubmitting(true)
    setMessage(null)
    try {
      await createOrder(product.id, product.price, form)
      setMessage({ type: 'ok', text: '感謝收藏！我們將盡快與您聯繫確認。' })
      setForm(emptyForm)
      setShowForm(false)
      onOrderSuccess()
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      {/* 背景遮罩 */}
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="關閉"
      />

      <GlassPanel className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-0">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white"
          aria-label="關閉視窗"
        >
          ✕
        </button>

        <ProductImageGallery product={product} isSold={isSold} />

        <div className="p-8">
          <p className="text-xs tracking-[0.25em] text-amber-glow/70">
            {getCategoryLabel(product.category)} · ONE OF ONE
          </p>
          <h2
            id="product-modal-title"
            className="mt-2 font-display text-3xl text-white"
          >
            {product.name}
          </h2>
          <p className="mt-2 text-xl text-amber-glow">
            NT$ {product.price.toLocaleString()}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-amber-glow/30 px-3 py-1 text-xs text-amber-glow/80"
              >
                {tag}
              </span>
            ))}
          </div>

          <MetalDivider />
          <p className="mt-6 leading-relaxed text-white/70">{product.description}</p>

          {message && (
            <p
              className={`mt-4 text-sm ${
                message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {message.text}
            </p>
          )}

          {!isSold && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-8 w-full rounded-lg border border-amber-glow/50 bg-amber-glow/10 py-4 text-sm tracking-[0.2em] text-amber-glow transition hover:bg-amber-glow/20"
            >
              立即收藏
            </button>
          )}

          {!isSold && showForm && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <p className="text-xs tracking-widest text-white/40">填寫收件資訊</p>
              <input
                required
                placeholder="姓名"
                value={form.buyer_name}
                onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
                className="input-field"
              />
              <input
                required
                type="tel"
                placeholder="聯絡電話"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
              <textarea
                required
                rows={3}
                placeholder="收件地址"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-field resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-amber-glow/90 py-4 text-sm font-medium tracking-widest text-void transition hover:bg-amber-glow disabled:opacity-50"
              >
                {submitting ? '送出中…' : '確認送出訂單'}
              </button>
            </form>
          )}

          {isSold && (
            <p className="mt-8 text-center text-sm tracking-wide text-white/40">
              此晶石已被收藏，僅供欣賞
            </p>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}
