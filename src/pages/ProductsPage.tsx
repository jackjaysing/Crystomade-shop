import { useCategoryScrollSpy } from '../hooks/useCategoryScrollSpy'
import { useProductsListHomeReset } from '../hooks/useProductsListHomeReset'
import { useRestoreProductsListScroll } from '../hooks/useRestoreProductsListSession'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ProductsListSessionProvider } from '../contexts/ProductsListSessionContext'
import { loadPendingProductsListRestore } from '../lib/productsListSession'

import { TAG_FILTERS } from '../constants/tags'

import { PRODUCT_CATEGORIES } from '../constants/categories'

import {

  CRYSTAL_COLOR_FILTERS,

  productMatchesCrystalColor,

} from '../constants/crystalColors'

import { BraceletStyleFilter } from '../components/products/BraceletStyleFilter'
import { CategoryFilter } from '../components/products/CategoryFilter'

import {

  CategoryProductSections,

  useCategorySectionRefs,

} from '../components/products/CategoryProductSections'

import { StorefrontFilterBar } from '../components/products/StorefrontFilterBar'

import { BannerCarousel } from '../components/products/BannerCarousel'

import { CrystalColorFilter } from '../components/products/CrystalColorFilter'

import { ProductSearchBar } from '../components/products/ProductSearchBar'

import { SoldOutToggle } from '../components/products/SoldOutToggle'

import { ProductSortFilter } from '../components/products/ProductSortFilter'

import { TagFilter } from '../components/products/TagFilter'

import { ConnectionDiagnostics } from '../components/ui/ConnectionDiagnostics'

import { ScrollToTopFab } from '../components/ui/ScrollToTopFab'

import { WelcomeRegisterModal } from '../components/welcome/WelcomeRegisterModal'

import { useStorefrontProducts } from '../hooks/useStorefrontProducts'

import { useWelcomeRegisterPopup } from '../hooks/useWelcomeRegisterPopup'

import { useBanners } from '../hooks/useBanners'

import { isProductSoldOut } from '../lib/productStock'

import { productMatchesSearchQuery } from '../lib/productSearch'

import {

  loadShowSoldOutProducts,

  saveShowSoldOutProducts,

} from '../lib/soldOutVisibility'

import { sortProductsByMode, type ProductSortMode } from '../lib/sortProducts'

import type { BraceletStyle, Product, ProductCategory } from '../lib/types'



/** 買家前台：典藏商品頁 */

export function ProductsPage() {

  const { products, loading, error } = useStorefrontProducts()

  const { banners } = useBanners()

  const { open: welcomePopupOpen, dismiss: dismissWelcomePopup } =
    useWelcomeRegisterPopup()

  const [initialSession] = useState(() => loadPendingProductsListRestore())

  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(

    initialSession?.activeCategory ?? null

  )

  const [activeBraceletStyle, setActiveBraceletStyle] =

    useState<BraceletStyle | null>(initialSession?.activeBraceletStyle ?? null)

  const [activeFilterId, setActiveFilterId] = useState<string | null>(
    initialSession?.activeFilterId ?? null
  )

  const [activeCrystalColorId, setActiveCrystalColorId] = useState<string | null>(

    initialSession?.activeCrystalColorId ?? null

  )

  const [searchQuery, setSearchQuery] = useState(initialSession?.searchQuery ?? '')

  const [sortMode, setSortMode] = useState<ProductSortMode>(
    initialSession?.sortMode ?? 'default'
  )

  const [showSoldOut, setShowSoldOut] = useState(
    () => initialSession?.showSoldOut ?? loadShowSoldOutProducts()
  )

  const productSectionRef = useRef<HTMLElement>(null)

  const categorySectionRefs = useCategorySectionRefs()

  useEffect(() => {
    if (initialSession?.showSoldOut !== undefined) {
      saveShowSoldOutProducts(initialSession.showSoldOut)
    }
  }, [initialSession?.showSoldOut])



  const scrollToCategory = (category: ProductCategory) => {

    setActiveCategory(category)

    suppressScrollSpy()

    requestAnimationFrame(() => {

      categorySectionRefs.current[category]?.scrollIntoView({

        behavior: 'smooth',

        block: 'start',

      })

    })

  }



  const handleSortChange = (mode: ProductSortMode) => {

    setSortMode(mode)

    requestAnimationFrame(() => {

      productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    })

  }



  const handleSoldOutVisibilityChange = (show: boolean) => {

    setShowSoldOut(show)

    saveShowSoldOutProducts(show)

  }



  const filteredProducts = useMemo(() => {

    let list = products



    if (!showSoldOut) {

      list = list.filter((p) => !isProductSoldOut(p))

    }



    if (searchQuery.trim()) {

      list = list.filter((p) => productMatchesSearchQuery(p, searchQuery))

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

  }, [

    products,

    showSoldOut,

    searchQuery,

    activeCrystalColorId,

    activeFilterId,

    sortMode,

  ])



  const productsByCategory = useMemo(() => {

    const grouped = Object.fromEntries(

      PRODUCT_CATEGORIES.map((cat) => [cat.id, [] as Product[]])

    ) as Record<ProductCategory, Product[]>



    for (const product of filteredProducts) {

      if (product.category === '手串' && activeBraceletStyle) {

        if (product.bracelet_style !== activeBraceletStyle) continue

      }

      grouped[product.category].push(product)

    }



    return grouped

  }, [filteredProducts, activeBraceletStyle])



  const hasAnyProducts = filteredProducts.length > 0



  const categoriesToShow = useMemo(

    () =>

      PRODUCT_CATEGORIES.filter((cat) =>

        filteredProducts.some((product) => product.category === cat.id)

      ).map((cat) => cat.id),

    [filteredProducts]

  )



  const visibleCategories = categoriesToShow



  const { suppressScrollSpy } = useCategoryScrollSpy(categorySectionRefs, {

    enabled: hasAnyProducts && !loading,

    visibleCategories,

    onActiveChange: setActiveCategory,

  })

  useRestoreProductsListScroll(!loading)

  useProductsListHomeReset({
    setActiveCategory,
    setActiveBraceletStyle,
    setActiveFilterId,
    setActiveCrystalColorId,
    setSearchQuery,
    setSortMode,
  })

  const getListSnapshot = useCallback(
    () => ({
      scrollY: window.scrollY,
      activeCategory,
      activeBraceletStyle,
      activeFilterId,
      activeCrystalColorId,
      searchQuery,
      sortMode,
      showSoldOut,
    }),
    [
      activeCategory,
      activeBraceletStyle,
      activeFilterId,
      activeCrystalColorId,
      searchQuery,
      sortMode,
      showSoldOut,
    ]
  )

  return (

    <ProductsListSessionProvider getSnapshot={getListSnapshot}>

    <div className="min-h-screen">

      <section className="relative overflow-hidden pb-0 pt-24 sm:pb-6">

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2a3a5c40_0%,_transparent_60%)]" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">

          <p className="text-xs tracking-[0.4em] text-amber-glow/60">CRYSTOMADE</p>

          <h1 className="mt-4 font-display text-5xl text-white sm:text-6xl">晶刻</h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/50">

            - 刻定屬於您的水晶能量夥伴 -

          </p>

        </div>

      </section>



      {banners.length > 0 && (

        <section className="mx-auto max-w-7xl px-4 pb-2 pt-2 sm:pt-0">

          <BannerCarousel banners={banners} />

        </section>

      )}



      <StorefrontFilterBar>

        <div className="flex items-center gap-2 pb-2">

          <div className="min-w-0 flex-1">

            <ProductSearchBar value={searchQuery} onChange={setSearchQuery} />

          </div>

          <SoldOutToggle

            showSoldOut={showSoldOut}

            onChange={handleSoldOutVisibilityChange}

          />

        </div>



        <div className="flex min-h-11 items-center gap-2 py-1.5">

          <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">

            品類

          </span>

          <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">

            <CategoryFilter

              activeCategory={activeCategory}

              onSelect={scrollToCategory}

            />

          </div>

        </div>



        <div className="flex min-h-11 items-center gap-2 border-t border-white/5 py-1.5">

          <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">

            手串

          </span>

          <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">

            <BraceletStyleFilter

              activeStyle={activeBraceletStyle}

              onSelect={setActiveBraceletStyle}

            />

          </div>

        </div>



        <div className="flex min-h-11 items-center gap-2 border-t border-white/5 py-1.5">

          <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">

            顏色

          </span>

          <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5 pl-2.5 pr-1">

            <CrystalColorFilter

              activeColorId={activeCrystalColorId}

              onSelect={setActiveCrystalColorId}

            />

          </div>

        </div>



        <div className="flex min-h-11 items-center gap-2 border-t border-white/5 py-1.5">

          <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">

            功效

          </span>

          <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">

            <TagFilter

              activeFilterId={activeFilterId}

              onSelect={setActiveFilterId}

            />

          </div>

        </div>



        <div className="flex min-h-11 items-center gap-2 border-t border-white/5 py-1.5">

          <span className="w-9 shrink-0 text-sm font-medium tracking-wide text-white/55">

            排序

          </span>

          <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">

            <ProductSortFilter activeSort={sortMode} onSelect={handleSortChange} />

          </div>

        </div>

      </StorefrontFilterBar>



      <section
        ref={productSectionRef}
        aria-labelledby="products-collection-heading"
        className="mx-auto max-w-7xl scroll-mt-72 px-4 py-12"
      >
        <h2 id="products-collection-heading" className="sr-only">
          水晶典藏商品
        </h2>

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

        {!loading && !error && !hasAnyProducts && (

          <p className="text-center text-white/40">

            {searchQuery.trim()

              ? '找不到符合搜尋的商品'

              : !showSoldOut

                ? '已隱藏完售商品，目前沒有其他符合條件的商品'

                : '目前沒有符合條件的商品'}

          </p>

        )}

        {!loading && !error && hasAnyProducts && (

          <CategoryProductSections

            productsByCategory={productsByCategory}

            categoriesToShow={categoriesToShow}

            sectionRefs={categorySectionRefs}

            activeBraceletStyle={activeBraceletStyle}

            onBraceletStyleSelect={setActiveBraceletStyle}

          />

        )}

      </section>



      <ScrollToTopFab

        targetRef={productSectionRef}

        ariaLabel="回到商品頂部"

        title="回到商品頂部"

      />

      <WelcomeRegisterModal
        open={welcomePopupOpen}
        onClose={dismissWelcomePopup}
      />

    </div>

    </ProductsListSessionProvider>

  )

}

