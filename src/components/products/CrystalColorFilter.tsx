import {
  CRYSTAL_COLOR_FILTERS,
  CRYSTAL_RAINBOW_GRADIENT,
} from '../../constants/crystalColors'

interface CrystalColorFilterProps {
  activeColorId: string | null
  onSelect: (colorId: string | null) => void
}

function circleClass(isActive: boolean): string {
  return `block h-8 w-8 shrink-0 rounded-full transition ${
    isActive
      ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950 scale-110'
      : 'opacity-90 hover:opacity-100 hover:scale-105'
  }`
}

/** 水晶色圓形圖示篩選（僅圖示） */
export function CrystalColorFilter({
  activeColorId,
  onSelect,
}: CrystalColorFilterProps) {
  return (
    <div className="flex flex-nowrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-label="全部水晶色"
        aria-pressed={activeColorId === null}
        className="shrink-0 p-0.5"
      >
        <span
          className={`${circleClass(activeColorId === null)} shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)]`}
          style={{ backgroundImage: CRYSTAL_RAINBOW_GRADIENT }}
        />
      </button>

      {CRYSTAL_COLOR_FILTERS.map((color) => {
        const isActive = activeColorId === color.id
        const isWhite = color.id === 'white'
        return (
          <button
            key={color.id}
            type="button"
            onClick={() => onSelect(isActive ? null : color.id)}
            aria-label={`${color.label}色水晶`}
            aria-pressed={isActive}
            className="shrink-0 p-0.5"
          >
            <span
              className={`${circleClass(isActive)} ${
                isWhite
                  ? 'border border-white/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'
                  : 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)]'
              }`}
              style={{ backgroundColor: color.hex }}
            />
          </button>
        )
      })}
    </div>
  )
}
