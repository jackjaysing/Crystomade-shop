import { BRACELET_STYLES } from '../../constants/braceletStyles'
import type { BraceletStyle } from '../../lib/types'

interface BraceletStyleFilterProps {
  activeStyle: BraceletStyle | null
  onSelect: (style: BraceletStyle | null) => void
}

/** 手串款式篩選：通用、男款、女款、兒童款 */
export function BraceletStyleFilter({
  activeStyle,
  onSelect,
}: BraceletStyleFilterProps) {
  return (
    <div className="flex flex-nowrap items-center justify-start gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full border px-5 py-2 text-sm tracking-wide transition ${
          activeStyle === null
            ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
            : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
        }`}
      >
        全部
      </button>

      {BRACELET_STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() =>
            onSelect(activeStyle === style.id ? null : style.id)
          }
          className={`rounded-full border px-5 py-2 text-sm tracking-wide transition ${
            activeStyle === style.id
              ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
              : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
          }`}
        >
          {style.label}
        </button>
      ))}
    </div>
  )
}
