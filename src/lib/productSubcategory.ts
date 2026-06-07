import {
  defaultSubcategoryForCategory,
  parseSubcategory,
  type ProductSubcategory,
} from '../constants/productSubcategories'
import type { ProductCategory } from './types'

export function resolveProductSubcategory(
  category: ProductCategory,
  value: string | null | undefined
): ProductSubcategory | null {
  if (category === '手串') return null
  return (
    parseSubcategory(value, category) ?? defaultSubcategoryForCategory(category)
  )
}

export function sanitizeSubcategoryForSave(
  category: ProductCategory,
  value: ProductSubcategory | null | undefined
): ProductSubcategory | null {
  return resolveProductSubcategory(category, value ?? undefined)
}
