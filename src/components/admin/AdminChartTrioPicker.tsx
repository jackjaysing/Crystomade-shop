import { FIVE_ELEMENTS } from '../../constants/fiveElements'
import type { FiveElement } from '../../constants/fiveElements'
import { toggleChartTrio } from '../../lib/memberFiveElementChart'

interface AdminChartTrioPickerProps {
  label: string
  value: FiveElement[]
  onChange: (elements: FiveElement[]) => void
}

/** 後台：本命／綜合三字點選（上限 3） */
export function AdminChartTrioPicker({
  label,
  value,
  onChange,
}: AdminChartTrioPickerProps) {
  return (
    <div>
      <p className="mb-2 text-xs text-white/50">
        {label}
        <span className="ml-2 text-white/35">（{value.length}/3）</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {FIVE_ELEMENTS.map((el) => {
          const selected = value.includes(el)
          const lockedOut = !selected && value.length >= 3
          return (
            <button
              key={el}
              type="button"
              onClick={() => onChange(toggleChartTrio(value, el))}
              disabled={lockedOut}
              aria-pressed={selected}
              className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition ${
                selected
                  ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                  : lockedOut
                    ? 'cursor-not-allowed border-white/5 text-white/25'
                    : 'border-white/10 text-white/50 hover:border-white/25'
              }`}
            >
              {el}
            </button>
          )
        })}
      </div>
    </div>
  )
}
