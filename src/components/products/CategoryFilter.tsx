import { PRODUCT_CATEGORIES } from '../../constants/categories'
import type { ProductCategory } from '../../lib/types'

interface CategoryFilterProps {
  activeCategory: ProductCategory | null
  onSelect: (category: ProductCategory) => void
}

/** 品類導覽：點擊捲動至對應橫向商品列 */
export function CategoryFilter({ activeCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-nowrap items-center justify-start gap-2">
      {PRODUCT_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={`rounded-full border px-5 py-2 text-sm tracking-wide transition ${
            activeCategory === cat.id
              ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
              : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
