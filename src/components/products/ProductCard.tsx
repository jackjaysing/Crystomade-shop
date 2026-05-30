import { getCategoryLabel } from '../../constants/categories'
import type { Product } from '../../lib/types'

interface ProductCardProps {
  product: Product
  onClick: () => void
}

/** 單一商品卡片（瀑布流格內） */
export function ProductCard({ product, onClick }: ProductCardProps) {
  const isSold = product.status === 'sold'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-graphite transition hover:border-amber-glow/30 hover:shadow-gold"
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
}
