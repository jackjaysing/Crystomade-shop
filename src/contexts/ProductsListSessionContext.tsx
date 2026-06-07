import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  saveProductsListSession,
  type ProductsListSessionState,
} from '../lib/productsListSession'

type ProductsListSnapshot = Omit<ProductsListSessionState, 'savedAt'>

const ProductsListSessionContext = createContext<(() => void) | null>(null)

interface ProductsListSessionProviderProps {
  getSnapshot: () => ProductsListSnapshot
  children: ReactNode
}

/** 點商品進詳情前，保存列表捲動與篩選狀態 */
export function ProductsListSessionProvider({
  getSnapshot,
  children,
}: ProductsListSessionProviderProps) {
  const saveBeforeProductOpen = useCallback(() => {
    saveProductsListSession(getSnapshot())
  }, [getSnapshot])

  const value = useMemo(
    () => saveBeforeProductOpen,
    [saveBeforeProductOpen]
  )

  return (
    <ProductsListSessionContext.Provider value={value}>
      {children}
    </ProductsListSessionContext.Provider>
  )
}

export function useSaveProductsListSession(): () => void {
  const save = useContext(ProductsListSessionContext)
  return save ?? (() => {})
}
