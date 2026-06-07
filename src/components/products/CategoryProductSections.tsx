import { useRef, type RefObject } from 'react'
import type { ProductSubcategory } from '../../constants/productSubcategories'
import type { BraceletStyle, Product, ProductCategory } from '../../lib/types'
import { CategoryProductRow } from './CategoryProductRow'

interface CategoryProductSectionsProps {
  productsByCategory: Record<ProductCategory, Product[]>
  categoriesToShow: ProductCategory[]
  sectionRefs: RefObject<Record<ProductCategory, HTMLElement | null>>
  activeBraceletStyle?: BraceletStyle | null
  onBraceletStyleSelect?: (style: BraceletStyle | null) => void
  activeOrnamentSubcategory?: ProductSubcategory | null
  onOrnamentSubcategorySelect?: (subcategory: ProductSubcategory | null) => void
  activeMineralSubcategory?: ProductSubcategory | null
  onMineralSubcategorySelect?: (subcategory: ProductSubcategory | null) => void
}

/** 典藏：手串／擺件／礦石分欄橫向卷軸 */
export function CategoryProductSections({
  productsByCategory,
  categoriesToShow,
  sectionRefs,
  activeBraceletStyle,
  onBraceletStyleSelect,
  activeOrnamentSubcategory,
  onOrnamentSubcategorySelect,
  activeMineralSubcategory,
  onMineralSubcategorySelect,
}: CategoryProductSectionsProps) {
  return (
    <div className="space-y-12 md:space-y-16">
      {categoriesToShow.map((categoryId) => (
        <CategoryProductRow
          key={categoryId}
          ref={(node) => {
            sectionRefs.current[categoryId] = node
          }}
          category={categoryId}
          products={productsByCategory[categoryId]}
          activeBraceletStyle={activeBraceletStyle}
          onBraceletStyleSelect={onBraceletStyleSelect}
          activeSubcategory={
            categoryId === '擺件'
              ? activeOrnamentSubcategory
              : categoryId === '礦石'
                ? activeMineralSubcategory
                : null
          }
          onSubcategorySelect={
            categoryId === '擺件'
              ? onOrnamentSubcategorySelect
              : categoryId === '礦石'
                ? onMineralSubcategorySelect
                : undefined
          }
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
