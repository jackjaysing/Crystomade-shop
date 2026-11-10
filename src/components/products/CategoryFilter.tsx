import {
  CAMPAIGN_SECTION_ID,
  PRODUCT_CATEGORIES,
  type StorefrontSectionId,
} from '../../constants/categories'

interface CategoryFilterProps {
  activeCategory: StorefrontSectionId | null
  onSelect: (category: StorefrontSectionId) => void
  /** 有活動商品時才顯示「活動」導覽 */
  showCampaign?: boolean
}

/** 品類導覽：點擊捲動至對應橫向商品列（活動置頂） */
export function CategoryFilter({
  activeCategory,
  onSelect,
  showCampaign = false,
}: CategoryFilterProps) {
  const items: { id: StorefrontSectionId; label: string }[] = [
    ...(showCampaign
      ? [{ id: CAMPAIGN_SECTION_ID, label: CAMPAIGN_SECTION_ID }]
      : []),
    ...PRODUCT_CATEGORIES,
  ]

  return (
    <div className="flex flex-nowrap items-center justify-start gap-2">
      {items.map((cat) => (
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
