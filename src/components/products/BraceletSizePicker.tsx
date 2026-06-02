import {
  BRACELET_SIZE_UNDECIDED,
  BRACELET_SIZES_CM,
} from '../../constants/braceletSizes'

interface BraceletSizePickerProps {
  value: string | null
  onChange: (size: string) => void
  /** 緊湊版（加購卡片） */
  compact?: boolean
  disabled?: boolean
}

/** 手串淨手圍選擇 */
export function BraceletSizePicker({
  value,
  onChange,
  compact = false,
  disabled = false,
}: BraceletSizePickerProps) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <p
        className={
          compact
            ? 'text-xs font-medium tracking-wide text-amber-glow/90'
            : 'text-sm font-medium tracking-wide text-amber-glow'
        }
      >
        請選擇手圍
      </p>
      <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {BRACELET_SIZES_CM.map((size) => {
          const selected = value === size
          return (
            <button
              key={size}
              type="button"
              onClick={() => onChange(size)}
              disabled={disabled}
              className={`rounded-full border px-3 transition ${
                compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
              } ${
                selected
                  ? 'border-amber-glow bg-amber-glow/15 text-amber-glow'
                  : 'border-white/15 bg-white/5 text-white/70 hover:border-amber-glow/40 hover:text-amber-glow'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {size} cm
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onChange(BRACELET_SIZE_UNDECIDED)}
          disabled={disabled}
          className={`rounded-full border px-3 transition ${
            compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
          } ${
            value === BRACELET_SIZE_UNDECIDED
              ? 'border-amber-glow bg-amber-glow/15 text-amber-glow'
              : 'border-white/15 bg-white/5 text-white/70 hover:border-amber-glow/40 hover:text-amber-glow'
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          還不確定
        </button>
      </div>
    </div>
  )
}
