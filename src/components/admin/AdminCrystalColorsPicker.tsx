import {
  CRYSTAL_COLOR_FILTERS,
  formatCrystalColorLabels,
} from '../../constants/crystalColors'

interface AdminCrystalColorsPickerProps {
  value: string[]
  onChange: (colors: string[]) => void
}

/** 後台：珠材顏色類別複選 */
export function AdminCrystalColorsPicker({
  value,
  onChange,
}: AdminCrystalColorsPickerProps) {
  const toggle = (label: string) => {
    onChange(
      value.includes(label) ? value.filter((item) => item !== label) : [...value, label]
    )
  }

  return (
    <div>
      <p className="mb-2 text-sm text-white/60">顏色類別（可複選）</p>
      <div className="flex flex-wrap gap-2">
        {CRYSTAL_COLOR_FILTERS.map((color) => (
          <label
            key={color.id}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm transition ${
              value.includes(color.label)
                ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                : 'border-white/10 text-white/50'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={value.includes(color.label)}
              onChange={() => toggle(color.label)}
            />
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20"
              style={{ backgroundColor: color.hex }}
              aria-hidden
            />
            {color.label}
          </label>
        ))}
      </div>
      {value.length > 0 && (
        <p className="mt-2 text-xs text-white/40">
          已選：{formatCrystalColorLabels(value)}
        </p>
      )}
    </div>
  )
}
