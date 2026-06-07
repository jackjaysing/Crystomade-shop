import type { SubcategoryOption } from '../../constants/productSubcategories'
import type { ProductSubcategory } from '../../constants/productSubcategories'

interface ProductSubcategoryFilterProps {
  options: readonly SubcategoryOption<ProductSubcategory>[]
  activeSubcategory: ProductSubcategory | null
  onSelect: (subcategory: ProductSubcategory | null) => void
  /** bar：篩選列；inline：商品區塊標題旁 */
  variant?: 'bar' | 'inline'
}

/** 擺件／礦石細項篩選 */
export function ProductSubcategoryFilter({
  options,
  activeSubcategory,
  onSelect,
  variant = 'bar',
}: ProductSubcategoryFilterProps) {
  const isInline = variant === 'inline'
  const buttonClass = (active: boolean) =>
    `rounded-full border tracking-wide transition ${
      isInline ? 'px-3 py-1 text-xs' : 'px-5 py-2 text-sm'
    } ${
      active
        ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
        : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
    }`

  return (
    <div className="flex flex-nowrap items-center justify-start gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={buttonClass(activeSubcategory === null)}
      >
        全部
      </button>

      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() =>
            onSelect(activeSubcategory === option.id ? null : option.id)
          }
          className={buttonClass(activeSubcategory === option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
