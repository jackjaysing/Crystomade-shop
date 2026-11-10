import { STUDIO_LOCATIONS } from '../../constants/studioLocations'
import type { StudioLocation } from '../../lib/types'

interface AdminProductStudioPickerProps {
  /** 同頁多份表單時避免 key 衝突 */
  name: string
  value: StudioLocation | null
  onChange: (studio: StudioLocation | null) => void
}

/** 後台：商品分潤歸屬單選（button 避免捲動跳動） */
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
      <p className="mb-2 text-xs text-white/50">分潤歸屬</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${name}-studio-location`}>
        {options.map((option) => (
          <button
            key={option.id ?? 'none'}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              value === option.id
                ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                : 'border-white/10 text-white/50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-white/35">
        指定後，此商品的已結帳訂單淨利潤會計入該人分潤
      </p>
    </div>
  )
}
