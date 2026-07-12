import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getProductCategoryLabel } from '../../constants/categories'
import { productRequiresBraceletSize } from '../../constants/braceletSizes'
import { useCart } from '../../contexts/CartContext'
import { useProductViewTracker } from '../../hooks/useProductViewTracker'
import { fetchBraceletShopSettings } from '../../lib/api/braceletShopSettings'
import { isBespokeSoulCardProduct } from '../../lib/grimoireFulfillment'
import { isProductSoldOut } from '../../lib/productStock'
import { productConfigurePath } from '../../lib/productSlug'
import type { Product } from '../../lib/types'
import { HotProductFrame } from './HotProductFrame'
import { ProductImageGallery } from './ProductImageGallery'
import { ProductOrderPaymentNotice } from './ProductOrderPaymentNotice'
import { ProductPriceDisplay } from './ProductPriceDisplay'
import { ProductShareButton } from './ProductShareButton'
import { BraceletSizePicker } from './BraceletSizePicker'
import { FiveElementsDisplay } from './FiveElementsDisplay'
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
  const [beadsRestocking, setBeadsRestocking] = useState(false)

  useProductViewTracker(product.id)

  const isSold = isProductSoldOut(product)
  const needsSize = productRequiresBraceletSize(product.category)
  const isConfigurable = isBespokeSoulCardProduct(product.name)
  const canAdd = !needsSize || Boolean(selectedSize)

  useEffect(() => {
    if (!isConfigurable) return
    let cancelled = false
    void fetchBraceletShopSettings()
      .then((settings) => {
        if (!cancelled) setBeadsRestocking(settings.beads_restocking)
      })
      .catch(() => {
        if (!cancelled) setBeadsRestocking(false)
      })
    return () => {
      cancelled = true
    }
  }, [isConfigurable])

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
          <nav aria-label="麵包屑" className="text-xs text-white/45">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/products" className="transition hover:text-amber-glow">
                  典藏選購
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span>{getProductCategoryLabel(product)}</span>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span className="text-white/70" aria-current="page">
                  {product.name}
                </span>
              </li>
            </ol>
          </nav>

          <button
            type="button"
            onClick={handleBackToProducts}
            className="mt-3 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-amber-glow"
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

              <div className="mt-5">
                <FiveElementsDisplay elements={product.five_elements} />
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

              {!isSold && isConfigurable && (
                <div className="mt-8 space-y-5">
                  <div>
                    <p className="text-lg tracking-wide text-amber-glow">
                      請選擇一種配珠方式
                    </p>
                    <p className="mt-1.5 text-base text-white/60">
                      點選下方卡片即可繼續
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      to={productConfigurePath(product)}
                      className="group flex flex-col rounded-xl border border-amber-glow/40 bg-gradient-to-b from-amber-glow/15 to-black/20 px-4 py-5 text-left transition hover:border-amber-glow/65 hover:from-amber-glow/20"
                    >
                      <span className="text-xs tracking-[0.2em] text-amber-glow/80">
                        方式一
                      </span>
                      <span className="mt-1 text-xl font-medium tracking-[0.12em] text-amber-glow">
                        自行配珠
                      </span>
                      <span className="mt-2 flex-1 text-base leading-relaxed text-white/70">
                        自己選珠、排順序與目標，下單後由晶刻串製。
                      </span>
                      <span className="mt-5 inline-flex items-center justify-center rounded-lg bg-amber-glow/90 py-3.5 text-base font-medium tracking-wider text-void transition group-hover:bg-amber-glow">
                        開始自行配珠
                      </span>
                    </Link>

                    <div className="flex flex-col rounded-xl border border-white/20 bg-black/30 px-4 py-5">
                      <span className="text-xs tracking-[0.2em] text-white/55">
                        方式二
                      </span>
                      <span className="mt-1 text-xl font-medium tracking-[0.12em] text-white">
                        官方配珠
                      </span>
                      <span className="mt-2 flex-1 text-base leading-relaxed text-white/70">
                        交由晶刻依五行及需求配置，較精準。
                      </span>
                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          disabled={!canAdd}
                          className="flex-1 rounded-lg border border-white/25 py-3.5 text-base tracking-wider text-white/85 transition hover:border-amber-glow/45 hover:text-amber-glow disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          加入購物車
                        </button>
                        <button
                          type="button"
                          onClick={handleBuyNow}
                          disabled={!canAdd}
                          className="flex-1 rounded-lg bg-amber-glow/90 py-3.5 text-base font-medium tracking-wider text-void transition hover:bg-amber-glow disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          立即購買
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-base leading-relaxed text-white/60">
                    <p>
                      五行與功效提示僅供參考。串製時晶刻會依手圍適當增減水晶或補隔珠。
                    </p>
                    {beadsRestocking && (
                      <p>
                        部分珠子補貨中；如有其他需求可至
                        <Link
                          to="/wish-board"
                          className="mx-1 text-amber-glow underline underline-offset-2 hover:text-amber-200"
                        >
                          許願區
                        </Link>
                        許願，或等待官方上架。
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!isSold && !isConfigurable && (
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

          <button
            type="button"
            onClick={handleBackToProducts}
            className="mt-6 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-amber-glow"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            返回典藏
          </button>
        </section>
      </div>
    </div>
  )
}
