import { useCallback, useContext, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ProductsListSessionContext } from '../contexts/ProductsListSessionContext'
import {
  PRODUCTS_LIST_RESET_STATE,
  subscribeProductsListReset,
} from '../lib/productsListReset'
import { clearProductsListSession } from '../lib/productsListSession'
import type { ProductSortMode } from '../lib/sortProducts'
import type { ProductSubcategory } from '../constants/productSubcategories'
import type { BraceletStyle, ProductCategory } from '../lib/types'

interface UseProductsListHomeResetOptions {
  setActiveCategory: (value: ProductCategory | null) => void
  setActiveBraceletStyle: (value: BraceletStyle | null) => void
  setActiveOrnamentSubcategory: (value: ProductSubcategory | null) => void
  setActiveMineralSubcategory: (value: ProductSubcategory | null) => void
  setActiveFilterId: (value: string | null) => void
  setActiveCrystalColorId: (value: string | null) => void
  setSearchQuery: (value: string) => void
  setSortMode: (value: ProductSortMode) => void
}

/** 典藏頁回到頂部並重置篩選（logo／典藏再點一次） */
export function useProductsListHomeReset({
  setActiveCategory,
  setActiveBraceletStyle,
  setActiveOrnamentSubcategory,
  setActiveMineralSubcategory,
  setActiveFilterId,
  setActiveCrystalColorId,
  setSearchQuery,
  setSortMode,
}: UseProductsListHomeResetOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const sessionContext = useContext(ProductsListSessionContext)

  const resetToHome = useCallback(() => {
    clearProductsListSession()
    setActiveCategory(null)
    setActiveBraceletStyle(null)
    setActiveOrnamentSubcategory(null)
    setActiveMineralSubcategory(null)
    setActiveFilterId(null)
    setActiveCrystalColorId(null)
    setSearchQuery('')
    setSortMode('default')
    sessionContext?.resetAllCarousels()
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [
    sessionContext,
    setActiveBraceletStyle,
    setActiveOrnamentSubcategory,
    setActiveMineralSubcategory,
    setActiveCategory,
    setActiveCrystalColorId,
    setActiveFilterId,
    setSearchQuery,
    setSortMode,
  ])

  useEffect(() => subscribeProductsListReset(resetToHome), [resetToHome])

  useEffect(() => {
    const state = location.state as Record<string, unknown> | null
    if (state?.[PRODUCTS_LIST_RESET_STATE] !== true) return

    resetToHome()
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate, resetToHome])
}
