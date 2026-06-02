import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategoryLabel } from '../../constants/categories'
import { useCart } from '../../contexts/CartContext'
import { useProductViewTracker } from '../../hooks/useProductViewTracker'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { HotProductFrame } from './HotProductFrame'
import { ProductImageGallery } from './ProductImageGallery'
import { ProductOrderPaymentNotice } from './ProductOrderPaymentNotice'
import { ProductPriceDisplay } from './ProductPriceDisplay'
import { GlassPanel } from '../ui/GlassPanel'
import { MetalDivider } from '../ui/MetalDivider'

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

/** 商品詳情毛玻璃彈窗 */
export function ProductModal({ product, onClose }: ProductModalProps) {
  const navigate = useNavigate()
  const { addItem, openCart } = useCart()
  const [feedback, setFeedback] = useState<string | null>(null)

  useProductViewTracker(product?.id)

  if (!product) return null

  const isSold = isProductSoldOut(product)

  const handleAddToCart = () => {
    addItem(product)
    setFeedback('已加入購物車')
    window.setTimeout(() => setFeedback(null), 2000)
  }

  const handleBuyNow = () => {
    addItem(product)
    onClose()
    navigate('/checkout')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
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
          className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-full border-2 border-white/50 bg-void/90 px-3.5 py-2 text-white shadow-[0_4px_16px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-amber-glow hover:bg-void hover:text-amber-glow"
          aria-label="關閉視窗"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-5 w-5 shrink-0"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          <span className="text-xs font-medium tracking-widest">關閉</span>
        </button>

        {product.is_hot ? (
          <HotProductFrame topOnly>
            <ProductImageGallery product={product} isSold={isSold} />
          </HotProductFrame>
        ) : (
          <ProductImageGallery product={product} isSold={isSold} />
        )}

        <div className="p-8">
          <p className="text-xs tracking-[0.25em] text-amber-glow/70">
            {getCategoryLabel(product.category)}
            {!isSold && ` · 庫存 ${product.stock} 件`}
          </p>
          <h2
            id="product-modal-title"
            className="mt-2 font-display text-3xl text-white"
          >
            {product.name}
          </h2>
          <div className="mt-2">
            <ProductPriceDisplay product={product} variant="detail" />
          </div>

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
          <p className="mt-6 whitespace-pre-line leading-relaxed text-white/70">
            {product.description}
          </p>

          <ProductOrderPaymentNotice />

          {feedback && (
            <p className="mt-4 text-sm text-emerald-400">{feedback}</p>
          )}

          {!isSold && (
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 rounded-lg border border-amber-glow/50 bg-amber-glow/10 py-4 text-sm tracking-[0.15em] text-amber-glow transition hover:bg-amber-glow/20"
              >
                加入購物車
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 rounded-lg bg-amber-glow/90 py-4 text-sm font-medium tracking-[0.15em] text-void transition hover:bg-amber-glow"
              >
                立即購買
              </button>
            </div>
          )}

          {!isSold && (
            <button
              type="button"
              onClick={() => {
                handleAddToCart()
                openCart()
              }}
              className="mt-3 w-full text-center text-xs text-white/40 transition hover:text-amber-glow/70"
            >
              加入後查看購物車 →
            </button>
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
