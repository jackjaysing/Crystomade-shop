import { useMemo, useState } from 'react'
import { getCategoryLabel } from '../../constants/categories'
import { isProductSoldOut } from '../../lib/productStock'
import {
  markProductSold,
  setProductHot,
  swapProductOrder,
} from '../../lib/api/products'
import type { ProductViewStats } from '../../lib/api/analytics'
import { getProductSalePrice, hasProductDiscount } from '../../lib/productPricing'
import { canSwapProductWithNeighbor, sortProducts } from '../../lib/sortProducts'
import type { Product } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { HotProductBadge } from '../products/HotProductBadge'
import { ProductEditModal } from './ProductEditModal'

interface ProductListAdminProps {
  products: Product[]
  viewStatsByProductId?: Map<string, ProductViewStats>
  viewStatsError?: string | null
  onUpdated: () => void
}

/** 後台：現有商品列表、編輯與一鍵設為已售出 */
export function ProductListAdmin({
  products,
  viewStatsByProductId,
  viewStatsError,
  onUpdated,
}: ProductListAdminProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [hotUpdatingId, setHotUpdatingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  const sortedProducts = useMemo(() => sortProducts(products), [products])

  const handleMarkSold = async (id: string) => {
    if (!confirm('確定將此商品標記為已售出？')) return
    try {
      await markProductSold(id)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    }
  }

  const handleToggleHot = async (product: Product) => {
    setHotUpdatingId(product.id)
    try {
      await setProductHot(product.id, !product.is_hot)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setHotUpdatingId(null)
    }
  }

  const handleMove = async (productId: string, direction: 'up' | 'down') => {
    setMovingId(productId)
    try {
      await swapProductOrder(productId, direction, sortedProducts)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '排序失敗')
    } finally {
      setMovingId(null)
    }
  }

  return (
    <GlassPanel className="p-6">
      <h3 className="font-display text-xl text-amber-glow">現有商品</h3>
      <p className="mt-1 text-xs text-white/40">
        熱門商品固定置頂 · 熱門／一般商品皆可上移／下移（新上架預設排在該區塊最前）
      </p>
      {viewStatsError && (
        <p className="mt-2 text-xs text-amber-glow/80">
          商品瀏覽統計無法載入，請執行 migration-add-product-views.sql
        </p>
      )}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={onUpdated}
        />
      )}
      <ul className="mt-4 divide-y divide-white/5">
        {sortedProducts.map((p, index) => (
          <li key={p.id} className="flex gap-4 py-4">
            <img
              src={p.image_url}
              alt={p.name}
              className="h-16 w-16 shrink-0 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-2">
                <p className="font-medium leading-snug break-words text-white">
                  {p.name}
                </p>
                {p.is_hot && <HotProductBadge variant="inline" />}
              </div>
              <p className="text-sm text-amber-glow">
                {hasProductDiscount(p) ? (
                  <>
                    特價 NT$ {getProductSalePrice(p).toLocaleString()}
                    <span className="ml-2 text-xs text-white/40 line-through">
                      原價 {p.price.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>NT$ {p.price.toLocaleString()}</>
                )}
              </p>
              <p className="text-xs text-white/40">
                前台排序 {index + 1} · {getCategoryLabel(p.category)} ·{' '}
                {isProductSoldOut(p)
                  ? '已售罄'
                  : `上架中 · 庫存 ${p.stock} 件`}{' '}
                · {new Date(p.created_at).toLocaleDateString('zh-TW')}
              </p>
              {!viewStatsError && (
                <p className="mt-1 text-xs text-white/35">
                  今日瀏覽{' '}
                  <span className="text-amber-glow/80">
                    {(viewStatsByProductId?.get(p.id)?.todayCount ?? 0).toLocaleString('zh-TW')}
                  </span>
                  {' · '}
                  總瀏覽{' '}
                  <span className="text-white/55">
                    {(viewStatsByProductId?.get(p.id)?.totalCount ?? 0).toLocaleString('zh-TW')}
                  </span>
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    movingId === p.id ||
                    !canSwapProductWithNeighbor(sortedProducts, index, 'up')
                  }
                  onClick={() => void handleMove(p.id, 'up')}
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30"
                >
                  {movingId === p.id ? '…' : '上移'}
                </button>
                <button
                  type="button"
                  disabled={
                    movingId === p.id ||
                    !canSwapProductWithNeighbor(sortedProducts, index, 'down')
                  }
                  onClick={() => void handleMove(p.id, 'down')}
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30"
                >
                  {movingId === p.id ? '…' : '下移'}
                </button>
                <button
                  type="button"
                  disabled={hotUpdatingId === p.id}
                  onClick={() => void handleToggleHot(p)}
                  className={`rounded border px-4 py-2 text-xs transition disabled:opacity-50 ${
                    p.is_hot
                      ? 'border-orange-400/50 bg-orange-400/10 text-orange-200 hover:bg-orange-400/20'
                      : 'border-white/20 text-white/70 hover:border-orange-400/40 hover:text-orange-200'
                  }`}
                >
                  {hotUpdatingId === p.id
                    ? '處理中…'
                    : p.is_hot
                      ? '取消熱門'
                      : '設為熱門'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(p)}
                  className="rounded border border-amber-glow/40 px-4 py-2 text-xs text-amber-glow transition hover:bg-amber-glow/10"
                >
                  編輯
                </button>
                {!isProductSoldOut(p) && (
                  <button
                    type="button"
                    onClick={() => handleMarkSold(p.id)}
                    className="rounded border border-white/20 px-4 py-2 text-xs text-white/70 transition hover:border-amber-glow/50 hover:text-amber-glow"
                  >
                    一鍵設為已售出
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </GlassPanel>
  )
}
