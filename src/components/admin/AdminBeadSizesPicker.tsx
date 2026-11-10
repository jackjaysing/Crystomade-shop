import {
  BEAD_SIZE_CATEGORIES,
  BEAD_SIZE_LABELS,
  formatBeadSizes,
  type BeadSizeCategory,
} from '../../constants/beadSizes'

interface AdminBeadSizesPickerProps {
  value: BeadSizeCategory[]
  onChange: (sizes: BeadSizeCategory[]) => void
}

/** 後台：珠材咪數複選（button 避免捲動跳動） */
export function AdminBeadSizesPicker({ value, onChange }: AdminBeadSizesPickerProps) {
  const toggle = (size: BeadSizeCategory) => {
    onChange(
      value.includes(size) ? value.filter((item) => item !== size) : [...value, size]
    )
  }

  return (
    <div>
      <p className="mb-2 text-sm text-white/60">咪數（可複選）</p>
      <div className="flex flex-wrap gap-2">
        {BEAD_SIZE_CATEGORIES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => toggle(size)}
            aria-pressed={value.includes(size)}
            className={`flex min-h-10 items-center justify-center rounded-full border px-3 text-sm transition ${
              value.includes(size)
                ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                : 'border-white/10 text-white/50'
            }`}
          >
            {BEAD_SIZE_LABELS[size]}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <p className="mt-2 text-xs text-white/40">已選：{formatBeadSizes(value)}</p>
      )}
    </div>
  )
}
