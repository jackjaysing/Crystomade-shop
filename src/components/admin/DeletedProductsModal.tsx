import { useState } from 'react'
import { Archive, RotateCcw, X } from 'lucide-react'
import { getCategoryLabel } from '../../constants/categories'
import { restoreProduct } from '../../lib/api/products'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { useDeletedProducts } from '../../hooks/useDeletedProducts'
import { GlassPanel } from '../ui/GlassPanel'

interface DeletedProductsModalProps {
  onClose: () => void
  onRestored: () => void
}

/** 已刪除物品紀錄 · 可重新上架 */
export function DeletedProductsModal({
  onClose,
  onRestored,
}: DeletedProductsModalProps) {
  const { products, loading, error, reload } = useDeletedProducts(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = async (product: Product) => {
    if (
      !confirm(
        `確定要重新上架「${product.name}」？\n\n商品將回到前台典藏列表。`
      )
    ) {
      return
    }

    setRestoringId(product.id)
    try {
      await restoreProduct(product.id)
      await reload()
      onRestored()
    } catch (e) {
      alert(e instanceof Error ? e.message : '重新上架失敗')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deleted-products-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="關閉"
      />

      <GlassPanel className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-glow/80" strokeWidth={1.5} />
            <h2 id="deleted-products-title" className="font-display text-xl text-amber-glow">
              已刪除物品
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-sm text-white/40">載入刪除紀錄中…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !error && products.length === 0 && (
            <p className="py-12 text-center text-sm text-white/40">尚無刪除紀錄</p>
          )}

          {!loading && products.length > 0 && (
            <ul className="divide-y divide-white/5">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap"
                >
                  <img
                    src={product.image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded object-cover opacity-70 grayscale"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white/80">{product.name}</p>
                    <p className="text-sm text-amber-glow/80">
                      NT$ {product.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/40">
                      {getCategoryLabel(product.category)} ·{' '}
                      {isProductSoldOut(product)
                        ? '刪除前已售罄'
                        : `刪除前庫存 ${product.stock} 件`}
                    </p>
                    {product.deleted_at && (
                      <p className="mt-1 text-xs text-white/30">
                        刪除於{' '}
                        {new Date(product.deleted_at).toLocaleString('zh-TW')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={restoringId === product.id}
                    onClick={() => handleRestore(product)}
                    className="flex shrink-0 items-center gap-1.5 rounded border border-emerald-400/40 px-4 py-2 text-xs text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {restoringId === product.id ? '處理中…' : '重新上架'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}
