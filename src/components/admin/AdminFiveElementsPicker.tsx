import { FIVE_ELEMENTS } from '../../constants/fiveElements'
import type { FiveElement } from '../../constants/fiveElements'

interface AdminFiveElementsPickerProps {
  value: FiveElement[]
  onChange: (elements: FiveElement[]) => void
}

/** 後台：五行多選 */
export function AdminFiveElementsPicker({
  value,
  onChange,
}: AdminFiveElementsPickerProps) {
  const toggle = (el: FiveElement) => {
    onChange(
      value.includes(el) ? value.filter((item) => item !== el) : [...value, el]
    )
  }

  return (
    <div>
      <p className="mb-2 text-xs text-white/50">五行（可多選）</p>
      <div className="flex flex-wrap gap-2">
        {FIVE_ELEMENTS.map((el) => (
          <label
            key={el}
            className={`flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border px-3 text-sm transition ${
              value.includes(el)
                ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                : 'border-white/10 text-white/50'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={value.includes(el)}
              onChange={() => toggle(el)}
            />
            {el}
          </label>
        ))}
      </div>
    </div>
  )
}
