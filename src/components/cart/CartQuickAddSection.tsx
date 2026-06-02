import { useState } from 'react'
import { Plus } from 'lucide-react'
import { productRequiresBraceletSize } from '../../constants/braceletSizes'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { BraceletSizePicker } from '../products/BraceletSizePicker'
import { ProductPriceDisplay } from '../products/ProductPriceDisplay'

interface CartQuickAddSectionProps {
  products: Product[]
  loading: boolean
  onAdd: (product: Product, selectedSize?: string | null) => void
}

/** 購物車底部：熱門加購推薦橫向卡片（固定顯示，不因已在購物車而隱藏） */
export function CartQuickAddSection({
  products,
  loading,
  onAdd,
}: CartQuickAddSectionProps) {
  const [sizeByProduct, setSizeByProduct] = useState<Record<string, string>>({})
  const [sizeErrors, setSizeErrors] = useState<Record<string, string>>({})

  if (!loading && products.length === 0) {
    return null
  }

  const handleAdd = (product: Product) => {
    const needsSize = productRequiresBraceletSize(product.category)
    const selectedSize = needsSize ? sizeByProduct[product.id] : null

    if (needsSize && !selectedSize) {
      setSizeErrors((prev) => ({
        ...prev,
        [product.id]: '請選擇手圍',
      }))
      return
    }

    setSizeErrors((prev) => {
      const next = { ...prev }
      delete next[product.id]
      return next
    })
    onAdd(product, selectedSize)
  }

  return (
    <div className="rounded-xl border border-amber-glow/25 bg-amber-glow/[0.04] p-4">
      <p className="text-sm font-medium tracking-wide text-amber-glow/85">
        熱門加購推薦
      </p>

      {loading ? (
        <p className="mt-3 text-center text-sm text-white/40">載入推薦中…</p>
      ) : (
        <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-2">
          <ul className="flex min-w-max gap-4">
            {products.map((product) => {
              const soldOut = isProductSoldOut(product)
              const needsSize = productRequiresBraceletSize(product.category)

              return (
                <li
                  key={product.id}
                  className="w-40 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-void/60 sm:w-44"
                >
                  <img
                    src={product.image_url}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  <div className="space-y-2 p-2.5">
                    <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-white/90 sm:text-sm">
                      {product.name}
                    </p>
                    <ProductPriceDisplay product={product} variant="card" />
                    {needsSize && (
                      <BraceletSizePicker
                        compact
                        value={sizeByProduct[product.id] ?? null}
                        onChange={(size) => {
                          setSizeByProduct((prev) => ({
                            ...prev,
                            [product.id]: size,
                          }))
                          setSizeErrors((prev) => {
                            const next = { ...prev }
                            delete next[product.id]
                            return next
                          })
                        }}
                      />
                    )}
                    {sizeErrors[product.id] && (
                      <p className="text-[10px] text-red-300/90">
                        {sizeErrors[product.id]}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => handleAdd(product)}
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-amber-glow/45 bg-amber-glow/10 py-2 text-xs font-medium text-amber-glow transition hover:bg-amber-glow/20 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                      aria-label={`加入 ${product.name}`}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
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
