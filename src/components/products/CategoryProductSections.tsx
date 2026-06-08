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
  activeAccessorySubcategory?: ProductSubcategory | null
  onAccessorySubcategorySelect?: (subcategory: ProductSubcategory | null) => void
  activeOrnamentSubcategory?: ProductSubcategory | null
  onOrnamentSubcategorySelect?: (subcategory: ProductSubcategory | null) => void
  activeMineralSubcategory?: ProductSubcategory | null
  onMineralSubcategorySelect?: (subcategory: ProductSubcategory | null) => void
}

function getActiveSubcategory(
  categoryId: ProductCategory,
  accessory: ProductSubcategory | null | undefined,
  ornament: ProductSubcategory | null | undefined,
  mineral: ProductSubcategory | null | undefined
): ProductSubcategory | null | undefined {
  if (categoryId === '配飾') return accessory
  if (categoryId === '擺件') return ornament
  if (categoryId === '礦石') return mineral
  return null
}

function getSubcategorySelectHandler(
  categoryId: ProductCategory,
  onAccessory?: (subcategory: ProductSubcategory | null) => void,
  onOrnament?: (subcategory: ProductSubcategory | null) => void,
  onMineral?: (subcategory: ProductSubcategory | null) => void
) {
  if (categoryId === '配飾') return onAccessory
  if (categoryId === '擺件') return onOrnament
  if (categoryId === '礦石') return onMineral
  return undefined
}

/** 典藏：手串／配飾／擺件／礦石分欄橫向卷軸 */
export function CategoryProductSections({
  productsByCategory,
  categoriesToShow,
  sectionRefs,
  activeBraceletStyle,
  onBraceletStyleSelect,
  activeAccessorySubcategory,
  onAccessorySubcategorySelect,
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
          activeSubcategory={getActiveSubcategory(
            categoryId,
            activeAccessorySubcategory,
            activeOrnamentSubcategory,
            activeMineralSubcategory
          )}
          onSubcategorySelect={getSubcategorySelectHandler(
            categoryId,
            onAccessorySubcategorySelect,
            onOrnamentSubcategorySelect,
            onMineralSubcategorySelect
          )}
        />
      ))}
    </div>
  )
}

/** 品類區塊 ref 容器 */
export function useCategorySectionRefs() {
  return useRef<Record<ProductCategory, HTMLElement | null>>({
    手串: null,
    配飾: null,
    擺件: null,
    礦石: null,
  })
}
