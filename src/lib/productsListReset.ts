export const PRODUCTS_LIST_RESET_STATE = 'resetProductsList' as const

type ProductsListResetListener = () => void

const listeners = new Set<ProductsListResetListener>()

/** 典藏頁訂閱「回到初始狀態」 */
export function subscribeProductsListReset(listener: ProductsListResetListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 典藏頁已在 /products 時，點 logo／典藏觸發重置 */
export function requestProductsListReset() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  listeners.forEach((listener) => listener())
}
