import {
  getSubcategoriesForCategory,
  type ProductSubcategory,
} from '../../constants/productSubcategories'
import type { ProductCategory } from '../../lib/types'

interface AdminProductSubcategoryPickerProps {
  category: ProductCategory
  value: ProductSubcategory | null
  onChange: (subcategory: ProductSubcategory) => void
}

/** 後台：配飾／擺件／礦石細項單選 */
export function AdminProductSubcategoryPicker({
  category,
  value,
  onChange,
}: AdminProductSubcategoryPickerProps) {
  const options = getSubcategoriesForCategory(category)
  if (!options) return null

  return (
    <div>
      <p className="mb-2 text-xs text-white/50">
        {category}分類
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
              value === option.id
                ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                : 'border-white/10 text-white/50'
            }`}
          >
            <input
              type="radio"
              name={`subcategory-${category}`}
              className="sr-only"
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  )
}
