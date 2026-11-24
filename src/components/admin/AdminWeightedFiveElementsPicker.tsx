import { FIVE_ELEMENTS } from '../../constants/fiveElements'
import type { FiveElement, WeightedElement } from '../../constants/fiveElements'
import { cycleWeightedElement } from '../../lib/memberFiveElementChart'

interface AdminWeightedFiveElementsPickerProps {
  label: string
  hint?: string
  value: WeightedElement[]
  onChange: (elements: WeightedElement[]) => void
}

/** 後台：平衡／降 — 點選五行並循環強度（中→強→弱→一點點→取消） */
export function AdminWeightedFiveElementsPicker({
  label,
  hint = '點一下選中（預設中），再點改強度',
  value,
  onChange,
}: AdminWeightedFiveElementsPickerProps) {
  const byElement = new Map(
    value.map((item) => [item.element, item.intensity] as const)
  )

  return (
    <div>
      <p className="mb-1 text-xs text-white/50">{label}</p>
      {hint && <p className="mb-2 text-[11px] text-white/35">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {FIVE_ELEMENTS.map((el: FiveElement) => {
          const intensity = byElement.get(el)
          const selected = intensity != null
          return (
            <button
              key={el}
              type="button"
              onClick={() => onChange(cycleWeightedElement(value, el))}
              aria-pressed={selected}
              className={`flex min-h-10 min-w-10 flex-col items-center justify-center rounded-full border px-3 py-1 text-sm transition ${
                selected
                  ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                  : 'border-white/10 text-white/50 hover:border-white/25'
              }`}
            >
              <span>{el}</span>
              {selected && intensity !== '中' && (
                <span className="text-[10px] leading-tight text-amber-glow/70">
                  {intensity}
                </span>
              )}
              {selected && intensity === '中' && (
                <span className="text-[10px] leading-tight text-amber-glow/50">
                  中
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
