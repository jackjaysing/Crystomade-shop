import {
  CRYSTAL_COLOR_FILTERS,
  CRYSTAL_RAINBOW_GRADIENT,
} from '../../constants/crystalColors'

interface CrystalColorFilterProps {
  activeColorId: string | null
  onSelect: (colorId: string | null) => void
}

interface GlassColorSwatchProps {
  isActive: boolean
  backgroundColor?: string
  backgroundImage?: string
  isWhite?: boolean
}

/** 玻璃質感色票圓形 */
function GlassColorSwatch({
  isActive,
  backgroundColor,
  backgroundImage,
  isWhite = false,
}: GlassColorSwatchProps) {
  return (
    <span
      className={`relative block h-9 w-9 shrink-0 overflow-hidden rounded-full border shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.5)] transition duration-200 ${
        isWhite ? 'border-white/45' : 'border-white/20'
      } ${
        isActive
          ? 'scale-110 ring-2 ring-amber-glow/75 ring-offset-2 ring-offset-neutral-950'
          : 'opacity-90 hover:scale-105 hover:opacity-100'
      }`}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor, backgroundImage }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/60 via-white/20 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/30 via-transparent to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute left-[18%] top-[16%] h-[34%] w-[40%] rounded-full bg-white/70 blur-[0.5px]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-[12%] right-[14%] h-[18%] w-[22%] rounded-full bg-white/25 blur-[1px]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-[1px] rounded-full ring-1 ring-inset ring-white/25"
        aria-hidden
      />
    </span>
  )
}

/** 顏色圓形圖示篩選（玻璃質感） */
export function CrystalColorFilter({
  activeColorId,
  onSelect,
}: CrystalColorFilterProps) {
  return (
    <div className="flex flex-nowrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-label="全部顏色"
        aria-pressed={activeColorId === null}
        className="shrink-0 p-1"
      >
        <GlassColorSwatch
          isActive={activeColorId === null}
          backgroundImage={CRYSTAL_RAINBOW_GRADIENT}
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
            aria-label={`${color.label}色`}
            aria-pressed={isActive}
            className="shrink-0 p-1"
          >
            <GlassColorSwatch
              isActive={isActive}
              backgroundColor={color.hex}
              isWhite={isWhite}
            />
          </button>
        )
      })}
    </div>
  )
}
