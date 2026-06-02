import { Plus } from 'lucide-react'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { ProductPriceDisplay } from '../products/ProductPriceDisplay'

interface CartQuickAddSectionProps {
  products: Product[]
  cartProductIds: Set<string>
  loading: boolean
  onAdd: (product: Product) => void
}

/** 購物車底部：熱門配件快捷推薦橫向卡片 */
export function CartQuickAddSection({
  products,
  cartProductIds,
  loading,
  onAdd,
}: CartQuickAddSectionProps) {
  const visible = products.filter(
    (product) => !cartProductIds.has(product.id) && !isProductSoldOut(product)
  )

  if (!loading && visible.length === 0) {
    return null
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-glow/25 bg-amber-glow/[0.04] p-3">
      <p className="text-xs font-medium tracking-wide text-amber-glow/85">
        熱門配件快捷推薦
      </p>
      <p className="mt-0.5 text-[10px] text-white/40">與全站同價 · 一鍵加入購物車</p>

      {loading ? (
        <p className="mt-3 text-center text-xs text-white/40">載入推薦中…</p>
      ) : (
        <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
          <ul className="flex min-w-max gap-2.5">
            {visible.map((product) => {
              const inCart = cartProductIds.has(product.id)
              const soldOut = isProductSoldOut(product)

              return (
                <li
                  key={product.id}
                  className="w-[7.5rem] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-void/60 sm:w-32"
                >
                  <img
                    src={product.image_url}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  <div className="space-y-1.5 p-2">
                    <p className="line-clamp-2 min-h-[2.25rem] text-[11px] leading-snug text-white/85">
                      {product.name}
                    </p>
                    <div className="scale-90 origin-left">
                      <ProductPriceDisplay product={product} variant="card" />
                    </div>
                    <button
                      type="button"
                      disabled={inCart || soldOut}
                      onClick={() => onAdd(product)}
                      className="flex w-full items-center justify-center gap-1 rounded-md border border-amber-glow/45 bg-amber-glow/10 py-1.5 text-[11px] font-medium text-amber-glow transition hover:bg-amber-glow/20 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`加入 ${product.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      加入
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
