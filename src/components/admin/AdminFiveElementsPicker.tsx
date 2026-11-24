import { FIVE_ELEMENTS } from '../../constants/fiveElements'
import type { FiveElement } from '../../constants/fiveElements'

interface AdminFiveElementsPickerProps {
  value: FiveElement[]
  onChange: (elements: FiveElement[]) => void
  label?: string
  hint?: string
  /** 選中樣式：amber（預設）｜sky */
  accent?: 'amber' | 'sky'
}

/** 後台：五行多選（button 避免 sr-only radio/checkbox 造成捲動跳動） */
export function AdminFiveElementsPicker({
  value,
  onChange,
  label = '五行（可多選）',
  hint,
  accent = 'amber',
}: AdminFiveElementsPickerProps) {
  const toggle = (el: FiveElement) => {
    onChange(
      value.includes(el) ? value.filter((item) => item !== el) : [...value, el]
    )
  }

  const selectedClass =
    accent === 'sky'
      ? 'border-sky-400/50 bg-sky-400/10 text-sky-200'
      : 'border-amber-glow bg-amber-glow/10 text-amber-glow'

  return (
    <div>
      <p className="mb-2 text-xs text-white/50">{label}</p>
      {hint ? (
        <p className="-mt-1 mb-2 text-[11px] text-white/35">{hint}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {FIVE_ELEMENTS.map((el) => (
          <button
            key={el}
            type="button"
            onClick={() => toggle(el)}
            aria-pressed={value.includes(el)}
            className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition ${
              value.includes(el)
                ? selectedClass
                : 'border-white/10 text-white/50 hover:border-white/25'
            }`}
          >
            {el}
          </button>
        ))}
      </div>
    </div>
  )
}
