import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getProductCategoryLabel } from '../../constants/categories'
import { productRequiresBraceletSize } from '../../constants/braceletSizes'
import { useCart } from '../../contexts/CartContext'
import { useProductViewTracker } from '../../hooks/useProductViewTracker'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { HotProductFrame } from './HotProductFrame'
import { ProductImageGallery } from './ProductImageGallery'
import { ProductOrderPaymentNotice } from './ProductOrderPaymentNotice'
import { ProductPriceDisplay } from './ProductPriceDisplay'
import { ProductShareButton } from './ProductShareButton'
import { BraceletSizePicker } from './BraceletSizePicker'
import { GlassPanel } from '../ui/GlassPanel'
import { MetalDivider } from '../ui/MetalDivider'

interface ProductDetailViewProps {
  product: Product
}

/** 商品詳情內容（獨立頁版面） */
export function ProductDetailView({ product }: ProductDetailViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { addItem } = useCart()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  useProductViewTracker(product.id)

  const isSold = isProductSoldOut(product)
  const needsSize = productRequiresBraceletSize(product.category)
  const canAdd = !needsSize || Boolean(selectedSize)

  const tryAdd = (onSuccess: () => void) => {
    if (needsSize && !selectedSize) {
      setSizeError('請先選擇淨手圍')
      return
    }
    setSizeError(null)
    addItem(product, { selectedSize: needsSize ? selectedSize : null })
    onSuccess()
  }

  const handleAddToCart = () => {
    tryAdd(() => {
      setFeedback('已加入購物車')
      window.setTimeout(() => setFeedback(null), 2000)
    })
  }

  const handleBuyNow = () => {
    tryAdd(() => navigate('/checkout'))
  }

  const fromProductsList =
    (location.state as { fromProductsList?: boolean } | null)?.fromProductsList ===
    true

  const handleBackToProducts = () => {
    if (fromProductsList) {
      navigate(-1)
      return
    }
    navigate('/products')
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section aria-labelledby="product-detail-heading">
          <button
            type="button"
            onClick={handleBackToProducts}
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-amber-glow"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            返回典藏
          </button>

          <GlassPanel className="mt-6 overflow-hidden p-0">
            {product.is_hot ? (
              <HotProductFrame topOnly>
                <ProductImageGallery product={product} isSold={isSold} />
              </HotProductFrame>
            ) : (
              <ProductImageGallery product={product} isSold={isSold} />
            )}

            <div className="p-6 sm:p-8">
              <p className="text-xs tracking-[0.25em] text-amber-glow/70">
                {getProductCategoryLabel(product)}
                {!isSold && ` · 庫存 ${product.stock} 件`}
              </p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <h1
                  id="product-detail-heading"
                  className="min-w-0 flex-1 font-display text-3xl text-white sm:text-4xl"
                >
                  {product.name}
                </h1>
                <ProductShareButton product={product} />
              </div>
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

              {!isSold && needsSize && (
                <div className="mt-6">
                  <BraceletSizePicker
                    value={selectedSize}
                    onChange={(size) => {
                      setSelectedSize(size)
                      setSizeError(null)
                    }}
                  />
                  {sizeError && (
                    <p className="mt-2 text-xs text-red-300/90">{sizeError}</p>
                  )}
                </div>
              )}

              {feedback && (
                <p className="mt-4 text-sm text-emerald-400">{feedback}</p>
              )}

              {!isSold && (
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canAdd}
                    className="flex-1 rounded-lg border border-amber-glow/50 bg-amber-glow/10 py-4 text-sm tracking-[0.15em] text-amber-glow transition hover:bg-amber-glow/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    加入購物車
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!canAdd}
                    className="flex-1 rounded-lg bg-amber-glow/90 py-4 text-sm font-medium tracking-[0.15em] text-void transition hover:bg-amber-glow disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    立即購買
                  </button>
                </div>
              )}

              {isSold && (
                <p className="mt-8 text-center text-sm tracking-wide text-white/40">
                  此晶石已被收藏，僅供欣賞
                </p>
              )}
            </div>
          </GlassPanel>
        </section>
      </div>
    </div>
  )
}
