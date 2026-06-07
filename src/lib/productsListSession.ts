import type { ProductSortMode } from './sortProducts'
import type { BraceletStyle, ProductCategory } from './types'

export interface ProductsListSessionState {
  scrollY: number
  activeCategory: ProductCategory | null
  activeBraceletStyle: BraceletStyle | null
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
  state: Omit<ProductsListSessionState, 'savedAt'>
): void {
  try {
    const payload: ProductsListSessionState = {
      ...state,
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
      scrollY: typeof parsed.scrollY === 'number' ? parsed.scrollY : 0,
      activeCategory: parsed.activeCategory ?? null,
      activeBraceletStyle: parsed.activeBraceletStyle ?? null,
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

export function clearProductsListSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
