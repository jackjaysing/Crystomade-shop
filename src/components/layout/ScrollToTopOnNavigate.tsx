import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { loadPendingProductsListRestore } from '../../lib/productsListSession'

/** 換頁時捲回頂部；從商品詳情返回典藏列表時保留原捲動位置 */
export function ScrollToTopOnNavigate() {
  const { pathname } = useLocation()

  useEffect(() => {
    const pendingRestore = loadPendingProductsListRestore()
    if (pathname === '/products' && pendingRestore?.restoreOnNextProductsVisit) {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
