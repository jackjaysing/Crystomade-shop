import {
  PRODUCT_SORT_OPTIONS,
  type ProductSortMode,
} from '../../lib/sortProducts'

interface ProductSortFilterProps {
  activeSort: ProductSortMode
  onSelect: (sort: ProductSortMode) => void
}

/** 前台商品排序 */
export function ProductSortFilter({
  activeSort,
  onSelect,
}: ProductSortFilterProps) {
  return (
    <div className="flex flex-nowrap items-center justify-start gap-2">
      {PRODUCT_SORT_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className={`rounded-full border px-4 py-2 text-sm tracking-wide transition sm:px-5 ${
            activeSort === option.id
              ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
              : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
