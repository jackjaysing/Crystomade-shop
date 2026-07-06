import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  loadPendingProductsListRestore,
  saveProductsListSession,
  type CarouselScrollLeft,
  type ProductsListSessionState,
} from '../lib/productsListSession'
import type { ProductCategory } from '../lib/types'

type ProductsListSnapshot = Omit<
  ProductsListSessionState,
  'savedAt' | 'restoreOnNextProductsVisit'
>

interface CarouselControl {
  getScrollLeft: () => number
  setScrollLeft: (value: number) => void
}

interface ProductsListSessionContextValue {
  saveBeforeProductOpen: () => void
  registerCarousel: (category: ProductCategory, control: CarouselControl) => void
  unregisterCarousel: (category: ProductCategory) => void
  restorePendingCarousels: () => number
  resetAllCarousels: () => void
}

export const ProductsListSessionContext =
  createContext<ProductsListSessionContextValue | null>(null)

interface ProductsListSessionProviderProps {
  getSnapshot: () => Omit<ProductsListSnapshot, 'carouselScrollLeft'>
  children: ReactNode
}

const CAROUSEL_RESTORE_DELAYS_MS = [0, 50, 150, 300, 600, 1000, 1600]
const CAROUSEL_RESET_DELAYS_MS = [0, 50, 150, 300, 600, 1000]

function readCarouselSnapshot(
  registry: Map<ProductCategory, CarouselControl>
): CarouselScrollLeft {
  const snapshot: CarouselScrollLeft = {}

  for (const [category, control] of registry) {
    snapshot[category] = control.getScrollLeft()
  }

  return snapshot
}

function tryRestoreCarouselCategory(
  category: ProductCategory,
  control: CarouselControl,
  pending: CarouselScrollLeft
): boolean {
  const target = pending[category]
  if (typeof target !== 'number') return true

  control.setScrollLeft(target)
  const actual = control.getScrollLeft()

  if (Math.abs(actual - target) <= 6) {
    delete pending[category]
    return true
  }

  return false
}

/** 點商品進詳情前，保存列表捲動與篩選狀態 */
export function ProductsListSessionProvider({
  getSnapshot,
  children,
}: ProductsListSessionProviderProps) {
  const carouselRegistryRef = useRef(new Map<ProductCategory, CarouselControl>())
  const pendingCarouselRestoreRef = useRef(
    loadPendingProductsListRestore()?.carouselScrollLeft ?? {}
  )
  const carouselRestoreTimersRef = useRef(new Map<ProductCategory, number[]>())
  const carouselResetTimersRef = useRef<number[]>([])

  const clearAllCarouselRestoreTimers = useCallback(() => {
    for (const category of carouselRestoreTimersRef.current.keys()) {
      const timers = carouselRestoreTimersRef.current.get(category)
      timers?.forEach((timer) => clearTimeout(timer))
      carouselRestoreTimersRef.current.delete(category)
    }
  }, [])

  const clearCarouselRestoreTimers = useCallback((category: ProductCategory) => {
    const timers = carouselRestoreTimersRef.current.get(category)
    if (!timers) return
    timers.forEach((timer) => clearTimeout(timer))
    carouselRestoreTimersRef.current.delete(category)
  }, [])

  const scheduleCarouselRestore = useCallback(
    (category: ProductCategory, control: CarouselControl) => {
      clearCarouselRestoreTimers(category)

      const timers = CAROUSEL_RESTORE_DELAYS_MS.map((delay) =>
        window.setTimeout(() => {
          tryRestoreCarouselCategory(
            category,
            control,
            pendingCarouselRestoreRef.current
          )
        }, delay)
      )

      carouselRestoreTimersRef.current.set(category, timers)
    },
    [clearCarouselRestoreTimers]
  )

  const restorePendingCarousels = useCallback(() => {
    let remaining = 0

    for (const [category, control] of carouselRegistryRef.current) {
      const restored = tryRestoreCarouselCategory(
        category,
        control,
        pendingCarouselRestoreRef.current
      )
      if (!restored) remaining += 1
    }

    for (const category of Object.keys(pendingCarouselRestoreRef.current)) {
      if (
        !carouselRegistryRef.current.has(category as ProductCategory)
      ) {
        remaining += 1
      }
    }

    return remaining
  }, [])

  const registerCarousel = useCallback(
    (category: ProductCategory, control: CarouselControl) => {
      carouselRegistryRef.current.set(category, control)
      scheduleCarouselRestore(category, control)
    },
    [scheduleCarouselRestore]
  )

  const unregisterCarousel = useCallback(
    (category: ProductCategory) => {
      carouselRegistryRef.current.delete(category)
      clearCarouselRestoreTimers(category)
    },
    [clearCarouselRestoreTimers]
  )

  const resetAllCarousels = useCallback(() => {
    clearAllCarouselRestoreTimers()
    pendingCarouselRestoreRef.current = {}

    carouselResetTimersRef.current.forEach((timer) => clearTimeout(timer))
    carouselResetTimersRef.current = []

    const applyReset = () => {
      for (const [, control] of carouselRegistryRef.current) {
        control.setScrollLeft(0)
      }
    }

    applyReset()
    carouselResetTimersRef.current = CAROUSEL_RESET_DELAYS_MS.map((delay) =>
      window.setTimeout(applyReset, delay)
    )
  }, [clearAllCarouselRestoreTimers])

  const saveBeforeProductOpen = useCallback(() => {
    saveProductsListSession({
      ...getSnapshot(),
      carouselScrollLeft: readCarouselSnapshot(carouselRegistryRef.current),
    })
  }, [getSnapshot])

  const value = useMemo(
    () => ({
      saveBeforeProductOpen,
      registerCarousel,
      unregisterCarousel,
      restorePendingCarousels,
      resetAllCarousels,
    }),
    [
      saveBeforeProductOpen,
      registerCarousel,
      unregisterCarousel,
      restorePendingCarousels,
      resetAllCarousels,
    ]
  )

  return (
    <ProductsListSessionContext.Provider value={value}>
      {children}
    </ProductsListSessionContext.Provider>
  )
}

export function useSaveProductsListSession(): () => void {
  const context = useContext(ProductsListSessionContext)
  return context?.saveBeforeProductOpen ?? (() => {})
}

/** 註冊品類橫向捲軸，供返回列表時還原位置 */
export function useRegisterProductsCarousel(
  category: ProductCategory,
  trackRef: RefObject<HTMLDivElement | null>
) {
  const context = useContext(ProductsListSessionContext)

  useEffect(() => {
    const register = context?.registerCarousel
    const unregister = context?.unregisterCarousel
    if (!register || !unregister) return

    const control: CarouselControl = {
      getScrollLeft: () => trackRef.current?.scrollLeft ?? 0,
      setScrollLeft: (value: number) => {
        const track = trackRef.current
        if (!track) return
        track.scrollLeft = value
        track.dispatchEvent(new Event('scroll'))
      },
    }

    register(category, control)
    return () => unregister(category)
  }, [category, context, trackRef])
}
