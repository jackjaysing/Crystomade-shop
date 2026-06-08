import type { ProductSortMode } from './sortProducts'
import type { ProductSubcategory } from '../constants/productSubcategories'
import type { BraceletStyle, ProductCategory } from './types'

export type CarouselScrollLeft = Partial<Record<ProductCategory, number>>

export interface ProductsListSessionState {
  /** 從商品詳情返回典藏時才還原畫面 */
  restoreOnNextProductsVisit: boolean
  scrollY: number
  carouselScrollLeft: CarouselScrollLeft
  activeCategory: ProductCategory | null
  activeBraceletStyle: BraceletStyle | null
  activeAccessorySubcategory: ProductSubcategory | null
  activeOrnamentSubcategory: ProductSubcategory | null
  activeMineralSubcategory: ProductSubcategory | null
  activeFilterId: string | null
  activeCrystalColorId: string | null
  searchQuery: string
  sortMode: ProductSortMode
  showSoldOut: boolean
  savedAt: number
}

const STORAGE_KEY = 'crystomade-products-list-session'
const MAX_AGE_MS = 30 * 60 * 1000

export function saveProductsListSession(
  state: Omit<ProductsListSessionState, 'savedAt' | 'restoreOnNextProductsVisit'>
): void {
  try {
    const payload: ProductsListSessionState = {
      ...state,
      restoreOnNextProductsVisit: true,
      savedAt: Date.now(),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function loadProductsListSession(): ProductsListSessionState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<ProductsListSessionState>
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return {
      restoreOnNextProductsVisit: parsed.restoreOnNextProductsVisit === true,
      scrollY: typeof parsed.scrollY === 'number' ? parsed.scrollY : 0,
      carouselScrollLeft: normalizeCarouselScrollLeft(parsed.carouselScrollLeft),
      activeCategory: parsed.activeCategory ?? null,
      activeBraceletStyle: parsed.activeBraceletStyle ?? null,
      activeAccessorySubcategory: parsed.activeAccessorySubcategory ?? null,
      activeOrnamentSubcategory: parsed.activeOrnamentSubcategory ?? null,
      activeMineralSubcategory: parsed.activeMineralSubcategory ?? null,
      activeFilterId: parsed.activeFilterId ?? null,
      activeCrystalColorId: parsed.activeCrystalColorId ?? null,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      sortMode: parsed.sortMode ?? 'default',
      showSoldOut: parsed.showSoldOut !== false,
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

function normalizeCarouselScrollLeft(
  value: Partial<Record<ProductCategory, number>> | undefined
): CarouselScrollLeft {
  if (!value || typeof value !== 'object') return {}

  const categories: ProductCategory[] = ['手串', '配飾', '擺件', '礦石']
  const result: CarouselScrollLeft = {}

  for (const category of categories) {
    const scrollLeft = value[category]
    if (typeof scrollLeft === 'number' && scrollLeft >= 0) {
      result[category] = scrollLeft
    }
  }

  return result
}

export function clearProductsListSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 讀取待還原的列表狀態（僅從商品頁返回時有效） */
export function loadPendingProductsListRestore(): ProductsListSessionState | null {
  const session = loadProductsListSession()
  if (!session?.restoreOnNextProductsVisit) return null
  return session
}

/** 還原完成後清除標記，避免之後從導覽進入列表又跳回舊位置 */
export function markProductsListSessionRestored(): void {
  try {
    const session = loadProductsListSession()
    if (!session) return
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...session,
        restoreOnNextProductsVisit: false,
      })
    )
  } catch {
    /* ignore */
  }
}
