import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { ProductCategory } from '../lib/types'

interface UseCategoryScrollSpyOptions {
  enabled: boolean
  visibleCategories: ProductCategory[]
  onActiveChange: (category: ProductCategory) => void
}

function getActivationTop(): number {
  const headerHeight =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--site-header-height')
    ) || 64

  const filterBar = document.querySelector<HTMLElement>('[aria-label="商品篩選"]')
  const filterHeight = filterBar?.getBoundingClientRect().height ?? 0

  return headerHeight + filterHeight + 12
}

/** 捲動至品類區塊時，同步更新上方品類篩選 */
export function useCategoryScrollSpy(
  sectionRefs: RefObject<Record<ProductCategory, HTMLElement | null>>,
  { enabled, visibleCategories, onActiveChange }: UseCategoryScrollSpyOptions
) {
  const suppressRef = useRef(false)
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActiveRef = useRef<ProductCategory | null>(null)
  const onActiveChangeRef = useRef(onActiveChange)

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange
  }, [onActiveChange])

  const suppress = useCallback((durationMs = 900) => {
    suppressRef.current = true
    if (suppressTimerRef.current !== null) {
      clearTimeout(suppressTimerRef.current)
    }
    suppressTimerRef.current = setTimeout(() => {
      suppressRef.current = false
      suppressTimerRef.current = null
    }, durationMs)
  }, [])

  useEffect(() => {
    if (!enabled || visibleCategories.length === 0) return

    let rafId = 0

    const updateActiveCategory = () => {
      if (suppressRef.current) return

      const activationTop = getActivationTop()
      let current: ProductCategory | null = null

      for (const category of visibleCategories) {
        const section = sectionRefs.current[category]
        if (!section) continue
        if (section.getBoundingClientRect().top <= activationTop) {
          current = category
        }
      }

      if (!current || current === lastActiveRef.current) return

      lastActiveRef.current = current
      onActiveChangeRef.current(current)
    }

    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateActiveCategory)
    }

    const handleResize = () => {
      handleScroll()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    updateActiveCategory()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(rafId)
      if (suppressTimerRef.current !== null) {
        clearTimeout(suppressTimerRef.current)
      }
    }
  }, [enabled, sectionRefs, visibleCategories])

  return { suppressScrollSpy: suppress }
}
