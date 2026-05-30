import { TAG_FILTERS } from '../../constants/tags'

interface TagFilterProps {
  activeFilterId: string | null
  onSelect: (filterId: string | null) => void
}

/** 功效標籤快速篩選列 */
export function TagFilter({ activeFilterId, onSelect }: TagFilterProps) {
  return (
    <div>
      <p className="mb-3 text-center text-[10px] tracking-[0.35em] text-white/40">
        功效
      </p>
      <div className="flex flex-wrap justify-center gap-3">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full border px-5 py-2 text-sm tracking-wide transition ${
          activeFilterId === null
            ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
            : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
        }`}
      >
        全部
      </button>

      {TAG_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() =>
            onSelect(activeFilterId === filter.id ? null : filter.id)
          }
          className={`rounded-full border px-5 py-2 text-sm tracking-wide transition ${
            activeFilterId === filter.id
              ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
              : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
          }`}
          title={filter.description}
        >
          {filter.label}
          {filter.description && (
            <span className="ml-1 hidden text-xs opacity-50 sm:inline">
              ({filter.description})
            </span>
          )}
        </button>
      ))}
      </div>
    </div>
  )
}
