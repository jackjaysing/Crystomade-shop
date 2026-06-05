import { BRACELET_STYLES } from '../../constants/braceletStyles'
import type { BraceletStyle } from '../../lib/types'

interface BraceletStyleFilterProps {
  activeStyle: BraceletStyle | null
  onSelect: (style: BraceletStyle | null) => void
  /** bar：篩選列；inline：商品區塊標題旁 */
  variant?: 'bar' | 'inline'
}

/** 手串款式篩選：通用款、男款、女款、兒童款 */
export function BraceletStyleFilter({
  activeStyle,
  onSelect,
  variant = 'bar',
}: BraceletStyleFilterProps) {
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
        className={buttonClass(activeStyle === null)}
      >
        全部
      </button>

      {BRACELET_STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onSelect(activeStyle === style.id ? null : style.id)}
          className={buttonClass(activeStyle === style.id)}
        >
          {style.label}
        </button>
      ))}
    </div>
  )
}
