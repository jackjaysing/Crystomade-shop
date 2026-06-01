import type { ReactNode } from 'react'
import { getCategoryLabel } from '../../constants/categories'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { HotProductBadge } from './HotProductBadge'

interface ProductCardProps {
  product: Product
  onClick: () => void
}

/** 熱門商品：金屬漸層外框 */
function HotProductFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full rounded-[14px] bg-gradient-to-br from-amber-glow/90 via-orange-400/55 to-amber-deep/75 p-[2px] shadow-[0_0_28px_rgba(212,165,116,0.22)]">
      <div
        className="pointer-events-none absolute inset-[2px] rounded-[12px] border border-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[14px] bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12)_0%,_transparent_55%)]"
        aria-hidden
      />
      {children}
    </div>
  )
}

/** 單一商品卡片（瀑布流格內） */
export function ProductCard({ product, onClick }: ProductCardProps) {
  const isSold = isProductSoldOut(product)
  const isHot = product.is_hot

  const card = (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden bg-graphite transition ${
        isHot
          ? 'rounded-[11px] hover:shadow-[0_0_24px_rgba(212,165,116,0.15)]'
          : 'rounded-xl border border-white/5 hover:border-amber-glow/30 hover:shadow-gold'
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        {/* 金屬邊框光暈 */}
        <div className="pointer-events-none absolute inset-0 bg-metal-gradient opacity-0 transition group-hover:opacity-100" />

        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-void/70 px-2.5 py-1 text-[10px] tracking-wider text-amber-glow/90 backdrop-blur-sm">
          {getCategoryLabel(product.category)}
        </span>

        {product.is_hot && (
          <HotProductBadge className="absolute right-3 top-3 backdrop-blur-sm" />
        )}

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
        <p className="mt-1 text-sm text-amber-glow">
          NT$ {product.price.toLocaleString()}
        </p>
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
    </article>
  )

  if (isHot) {
    return <HotProductFrame>{card}</HotProductFrame>
  }

  return card
}
