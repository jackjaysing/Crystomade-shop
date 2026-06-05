import { useRef, type RefObject } from 'react'
import { PRODUCT_CATEGORIES } from '../../constants/categories'
import type { Product, ProductCategory } from '../../lib/types'
import { CategoryProductRow } from './CategoryProductRow'

interface CategoryProductSectionsProps {
  productsByCategory: Record<ProductCategory, Product[]>
  onProductClick: (product: Product) => void
  sectionRefs: RefObject<Record<ProductCategory, HTMLElement | null>>
}

/** 典藏：手串／擺件／礦石分欄橫向卷軸 */
export function CategoryProductSections({
  productsByCategory,
  onProductClick,
  sectionRefs,
}: CategoryProductSectionsProps) {
  const hasAnyProducts = PRODUCT_CATEGORIES.some(
    (cat) => productsByCategory[cat.id].length > 0
  )

  if (!hasAnyProducts) {
    return (
      <p className="text-center text-white/40">目前沒有符合條件的商品</p>
    )
  }

  return (
    <div className="space-y-12 md:space-y-16">
      {PRODUCT_CATEGORIES.map((cat) => (
        <CategoryProductRow
          key={cat.id}
          ref={(node) => {
            sectionRefs.current[cat.id] = node
          }}
          category={cat.id}
          products={productsByCategory[cat.id]}
          onProductClick={onProductClick}
        />
      ))}
    </div>
  )
}

/** 品類區塊 ref 容器 */
export function useCategorySectionRefs() {
  return useRef<Record<ProductCategory, HTMLElement | null>>({
    手串: null,
    擺件: null,
    礦石: null,
  })
}
