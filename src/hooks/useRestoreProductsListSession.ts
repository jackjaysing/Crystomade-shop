import { useEffect, useRef } from 'react'
import { loadProductsListSession } from '../lib/productsListSession'

/** 商品列表載入完成後還原捲動位置 */
export function useRestoreProductsListScroll(ready: boolean) {
  const restoredRef = useRef(false)
  const scrollTargetRef = useRef<number | null>(null)

  if (scrollTargetRef.current === null) {
    scrollTargetRef.current = loadProductsListSession()?.scrollY ?? null
  }

  useEffect(() => {
    if (!ready || restoredRef.current || scrollTargetRef.current == null) return

    restoredRef.current = true
    const scrollY = scrollTargetRef.current

    const restore = () => {
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(restore)
    })
  }, [ready])
}
