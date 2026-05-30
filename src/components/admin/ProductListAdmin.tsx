import { getCategoryLabel } from '../../constants/categories'
import { isProductSoldOut } from '../../lib/productStock'
import { markProductSold } from '../../lib/api/products'
import type { Product } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface ProductListAdminProps {
  products: Product[]
  onUpdated: () => void
}

/** 後台：現有商品列表與一鍵設為已售出 */
export function ProductListAdmin({ products, onUpdated }: ProductListAdminProps) {
  const handleMarkSold = async (id: string) => {
    if (!confirm('確定將此商品標記為已售出？')) return
    try {
      await markProductSold(id)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    }
  }

  return (
    <GlassPanel className="p-6">
      <h3 className="font-display text-xl text-amber-glow">現有商品</h3>
      <ul className="mt-4 divide-y divide-white/5">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap"
          >
            <img
              src={p.image_url}
              alt={p.name}
              className="h-16 w-16 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="text-sm text-amber-glow">
                NT$ {p.price.toLocaleString()}
              </p>
              <p className="text-xs text-white/40">
                {getCategoryLabel(p.category)} ·{' '}
                {isProductSoldOut(p)
                  ? '已售罄'
                  : `上架中 · 庫存 ${p.stock} 件`}{' '}
                · {new Date(p.created_at).toLocaleDateString('zh-TW')}
              </p>
            </div>
            {!isProductSoldOut(p) && (
              <button
                type="button"
                onClick={() => handleMarkSold(p.id)}
                className="shrink-0 rounded border border-white/20 px-4 py-2 text-xs text-white/70 transition hover:border-amber-glow/50 hover:text-amber-glow"
              >
                一鍵設為已售出
              </button>
            )}
          </li>
        ))}
      </ul>
    </GlassPanel>
  )
}
