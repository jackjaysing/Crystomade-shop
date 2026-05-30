import { PRODUCT_CATEGORIES } from '../../constants/categories'
import type { ProductCategory } from '../../lib/types'

interface CategoryFilterProps {
  activeCategory: ProductCategory | null
  onSelect: (category: ProductCategory | null) => void
}

/** 品類篩選：手串、擺件、礦石 */
export function CategoryFilter({ activeCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="mb-4">
      <p className="mb-3 text-center text-[10px] tracking-[0.35em] text-white/40">
        品類
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-full border px-5 py-2 text-sm tracking-wide transition ${
            activeCategory === null
              ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
              : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
          }`}
        >
          全部
        </button>

        {PRODUCT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              onSelect(activeCategory === cat.id ? null : cat.id)
            }
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
    </div>
  )
}
