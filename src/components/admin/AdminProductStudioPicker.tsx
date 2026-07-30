import { STUDIO_LOCATIONS } from '../../constants/studioLocations'
import type { StudioLocation } from '../../lib/types'

interface AdminProductStudioPickerProps {
  /** radio 群組名稱前綴（同頁多份表單時避免衝突） */
  name: string
  value: StudioLocation | null
  onChange: (studio: StudioLocation | null) => void
}

/** 後台：商品所屬實體工作室單選（供分潤統計） */
export function AdminProductStudioPicker({
  name,
  value,
  onChange,
}: AdminProductStudioPickerProps) {
  const options: { id: StudioLocation | null; label: string }[] = [
    { id: null, label: '未指定' },
    ...STUDIO_LOCATIONS.map((studio) => ({
      id: studio.id as StudioLocation | null,
      label: studio.label,
    })),
  ]

  return (
    <div>
      <p className="mb-2 text-xs text-white/50">所屬實體工作室</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.id ?? 'none'}
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
              value === option.id
                ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                : 'border-white/10 text-white/50'
            }`}
          >
            <input
              type="radio"
              name={`${name}-studio-location`}
              className="sr-only"
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-white/35">
        指定後，此商品的已結帳訂單淨利潤會計入該工作室分潤
      </p>
    </div>
  )
}
