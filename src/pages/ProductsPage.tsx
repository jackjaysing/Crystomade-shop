import { useMemo, useState } from 'react'
import { TAG_FILTERS } from '../constants/tags'
import {
  CRYSTAL_COLOR_FILTERS,
  productMatchesCrystalColor,
} from '../constants/crystalColors'
import { CategoryFilter } from '../components/products/CategoryFilter'
import { BannerCarousel } from '../components/products/BannerCarousel'
import { CrystalColorFilter } from '../components/products/CrystalColorFilter'
import { ProductMasonry } from '../components/products/ProductMasonry'
import { ProductModal } from '../components/products/ProductModal'
import { ProductSearchBar } from '../components/products/ProductSearchBar'
import { ProductSortFilter } from '../components/products/ProductSortFilter'
import { TagFilter } from '../components/products/TagFilter'
import { ConnectionDiagnostics } from '../components/ui/ConnectionDiagnostics'
import { useStorefrontProducts } from '../hooks/useStorefrontProducts'
import { useBanners } from '../hooks/useBanners'
import { productMatchesSearchQuery } from '../lib/productSearch'
import { sortProductsByMode, type ProductSortMode } from '../lib/sortProducts'
import type { Product, ProductCategory } from '../lib/types'

/** 買家前台：典藏商品頁 */
export function ProductsPage() {
  const { products, loading, error } = useStorefrontProducts()
  const { banners } = useBanners()
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(
    null
  )
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [activeCrystalColorId, setActiveCrystalColorId] = useState<string | null>(
    null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<ProductSortMode>('default')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  /** 依關鍵字 + 品類 + 水晶色 + 功效標籤篩選，再套用排序 */
  const filteredProducts = useMemo(() => {
    let list = products

    if (searchQuery.trim()) {
      list = list.filter((p) => productMatchesSearchQuery(p, searchQuery))
    }

    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory)
    }

    if (activeCrystalColorId) {
      const colorFilter = CRYSTAL_COLOR_FILTERS.find(
        (f) => f.id === activeCrystalColorId
      )
      if (colorFilter) {
        list = list.filter((p) => productMatchesCrystalColor(p, colorFilter))
      }
    }

    if (activeFilterId) {
      const filter = TAG_FILTERS.find((f) => f.id === activeFilterId)
      if (filter) {
        list = list.filter((p) => p.tags.includes(filter.label))
      }
    }

    return sortProductsByMode(list, sortMode)
  }, [products, searchQuery, activeCategory, activeCrystalColorId, activeFilterId, sortMode])

  return (
    <div className="min-h-screen">
      {/* 英雄區 */}
      <section className="relative overflow-hidden pb-8 pt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2a3a5c40_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs tracking-[0.4em] text-amber-glow/60">CRYSTOMADE</p>
          <h1 className="mt-4 font-display text-5xl text-white sm:text-6xl">
            晶刻
          </h1>
          
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/50">
            探索屬於您的水晶能量夥伴。
          </p>
        </div>
      </section>

      {/* 公告橫幅（搜尋列上方） */}
      {banners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-2">
          <BannerCarousel banners={banners} />
        </section>
      )}

      {/* 品類與功效篩選（手機極簡固定版） */}
        <section className="sticky top-[73px] z-30 border-y border-white/5 bg-neutral-950/90 backdrop-blur-md py-2">
          <div className="mx-auto max-w-7xl px-4">
            <div className="pb-2">
              <ProductSearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            
            {/* 第一排：品類 */}
            <div className="flex min-h-11 items-center gap-2 overflow-x-auto py-1.5 no-scrollbar">
              <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">品類</span>
              <div className="flex min-w-0 items-center">
                <CategoryFilter
                  activeCategory={activeCategory}
                  onSelect={setActiveCategory}
                />
              </div>
            </div>

            {/* 第二排：水晶色 */}
            <div className="flex min-h-11 items-center gap-2 overflow-x-auto border-t border-white/5 py-1.5 no-scrollbar">
              <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">水晶</span>
              <div className="flex min-w-0 items-center">
                <CrystalColorFilter
                  activeColorId={activeCrystalColorId}
                  onSelect={setActiveCrystalColorId}
                />
              </div>
            </div>

            {/* 第三排：功效 */}
            <div className="flex min-h-11 items-center gap-2 overflow-x-auto border-t border-white/5 py-1.5 no-scrollbar">
              <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">功效</span>
              <div className="flex min-w-0 items-center">
                <TagFilter
                  activeFilterId={activeFilterId}
                  onSelect={setActiveFilterId}
                />
              </div>
            </div>

            {/* 第四排：排序 */}
            <div className="flex min-h-11 items-center gap-2 overflow-x-auto border-t border-white/5 py-1.5 no-scrollbar">
              <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">排序</span>
              <div className="flex min-w-0 items-center">
                <ProductSortFilter activeSort={sortMode} onSelect={setSortMode} />
              </div>
            </div>

          </div>
        </section>

      {/* 商品瀑布流 */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        {loading && (
          <p className="text-center text-white/40">載入典藏中…</p>
        )}
        {error && (
          <div className="mx-auto max-w-lg rounded-xl border border-red-400/30 bg-red-950/30 p-6 text-center">
            <p className="text-red-300">{error}</p>
            <ul className="mt-4 space-y-2 text-left text-xs text-white/50">
              <li>
                1. 打開<strong className="text-white/70"> Healthy 的那個專案</strong>（不是舊專案）
              </li>
              <li>
                2. <strong className="text-white/70">Settings → API</strong>：複製{' '}
                <strong className="text-white/70">Project URL</strong> 與{' '}
                <strong className="text-white/70">Publishable key</strong>
              </li>
              <li>
                3. 貼到 <strong className="text-white/70">EDIT-ME-SUPABASE-KEYS.txt</strong> → 存檔 → 雙擊{' '}
                <strong className="text-white/70">SYNC-ENV.bat</strong>
              </li>
              <li>4. 終端 Ctrl+C → <strong className="text-white/70">npm.cmd run dev</strong> → 瀏覽器 F5</li>
            </ul>
            <ConnectionDiagnostics />
          </div>
        )}
        {!loading && !error && filteredProducts.length === 0 && (
          <p className="text-center text-white/40">
            {searchQuery.trim() ? '找不到符合搜尋的商品' : '此分類暫無商品'}
          </p>
        )}
        {!loading && filteredProducts.length > 0 && (
          <ProductMasonry
            products={filteredProducts}
            onProductClick={setSelectedProduct}
          />
        )}
      </section>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  )
}
