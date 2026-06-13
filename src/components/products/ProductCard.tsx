import { Link } from 'react-router-dom'
import { useSaveProductsListSession } from '../../contexts/ProductsListSessionContext'
import { getProductCategoryBadgeLines } from '../../constants/categories'
import { isProductSoldOut } from '../../lib/productStock'
import { productPhotoAlt } from '../../lib/imageAlt'
import { productDetailPath } from '../../lib/productSlug'
import type { Product } from '../../lib/types'
import { OptimizedImage } from '../ui/OptimizedImage'
import { HotProductFrame } from './HotProductFrame'
import { ProductImageBadges } from './ProductImageBadges'
import { ProductPriceDisplay } from './ProductPriceDisplay'

interface ProductCardProps {
  product: Product
}

/** 單一商品卡片（瀑布流格內） */
export function ProductCard({ product }: ProductCardProps) {
  const saveListSession = useSaveProductsListSession()
  const isSold = isProductSoldOut(product)
  const isHot = product.is_hot
  const categoryLines = getProductCategoryBadgeLines(product)

  const card = (
    <Link
      to={productDetailPath(product)}
      state={{ fromProductsList: true }}
      onClick={() => saveListSession()}
      className={`group relative flex h-full w-full flex-col overflow-hidden bg-graphite transition ${
        isHot
          ? 'rounded-[12px] hover:shadow-[0_0_24px_rgba(212,165,116,0.15)]'
          : 'rounded-xl border border-white/5 hover:border-amber-glow/30 hover:shadow-gold'
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <OptimizedImage
          src={product.image_url}
          alt={productPhotoAlt(product.name)}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        {/* 金屬邊框光暈 */}
        <div className="pointer-events-none absolute inset-0 bg-metal-gradient opacity-0 transition group-hover:opacity-100" />

        <span
          className={`absolute left-3 top-3 max-w-[4.5rem] border border-white/20 bg-void/70 px-2 py-1 text-[10px] leading-tight tracking-wider text-amber-glow/90 backdrop-blur-sm ${
            categoryLines.length > 1 ? 'rounded-md text-center' : 'rounded-full px-2.5'
          }`}
        >
          {categoryLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>

        <ProductImageBadges product={product} />

        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-void/60 backdrop-blur-[2px]">
            <div className="rotate-[-8deg] border border-amber-glow/40 px-6 py-3 text-center">
              <p className="font-display text-lg tracking-[0.2em] text-amber-glow">
                SOLD OUT
              </p>
              <p className="mt-1 text-xs tracking-widest text-white/70">
                已被收藏
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg text-white/90">{product.name}</h3>
        <div className="mt-1">
          <ProductPriceDisplay product={product} variant="card" />
        </div>
        {!isSold && (
          <p className="mt-1 text-xs text-white/45">
            庫存 {product.stock} 件
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {product.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded border border-white/10 px-2 py-0.5 text-[10px] tracking-wider text-white/40"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )

  if (isHot) {
    return <HotProductFrame className="h-full">{card}</HotProductFrame>
  }

  return card
}
