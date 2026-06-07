import { useContext, useEffect, useRef } from 'react'
import { ProductsListSessionContext } from '../contexts/ProductsListSessionContext'
import {
  loadPendingProductsListRestore,
  markProductsListSessionRestored,
} from '../lib/productsListSession'
import { subscribeProductsListReset } from '../lib/productsListReset'

const VERTICAL_RESTORE_DELAYS_MS = [0, 50, 150, 300, 600, 1000]
const CAROUSEL_POLL_DELAYS_MS = [0, 80, 160, 320, 500, 800, 1200, 1600]

/** 商品列表載入完成後還原垂直與橫向捲動位置 */
export function useRestoreProductsListScroll(ready: boolean) {
  const sessionContext = useContext(ProductsListSessionContext)
  const startedRef = useRef(false)
  const abortedRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const scrollTargetRef = useRef<number | null>(null)
  const hasCarouselRestoreRef = useRef(false)

  if (scrollTargetRef.current === null) {
    const session = loadPendingProductsListRestore()
    scrollTargetRef.current = session?.scrollY ?? null
    hasCarouselRestoreRef.current = Boolean(
      session && Object.keys(session.carouselScrollLeft).length > 0
    )
  }

  useEffect(() => {
    return subscribeProductsListReset(() => {
      abortedRef.current = true
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current = []
    })
  }, [])

  useEffect(() => {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      const previous = history.scrollRestoration
      history.scrollRestoration = 'manual'
      return () => {
        history.scrollRestoration = previous
      }
    }
  }, [])

  useEffect(() => {
    if (!ready || startedRef.current) return

    const scrollY = scrollTargetRef.current
    const shouldRestoreCarousel = hasCarouselRestoreRef.current

    if (scrollY == null && !shouldRestoreCarousel) return

    startedRef.current = true

    const restoreVertical = () => {
      if (abortedRef.current || scrollY == null) return
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
    }

    for (const delay of VERTICAL_RESTORE_DELAYS_MS) {
      timersRef.current.push(window.setTimeout(restoreVertical, delay))
    }

    if (shouldRestoreCarousel) {
      for (const delay of CAROUSEL_POLL_DELAYS_MS) {
        timersRef.current.push(
          window.setTimeout(() => {
            if (abortedRef.current) return
            sessionContext?.restorePendingCarousels()
          }, delay)
        )
      }
    }

    timersRef.current.push(
      window.setTimeout(() => {
        if (abortedRef.current) return
        markProductsListSessionRestored()
      }, 1800)
    )

    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current = []
    }
  }, [ready, sessionContext])
}
