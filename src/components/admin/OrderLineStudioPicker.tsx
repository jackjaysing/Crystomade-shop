import { useState } from 'react'
import { STUDIO_LOCATIONS } from '../../constants/studioLocations'
import { updateOrderLineStudioLocation } from '../../lib/api/orders'
import type { StudioLocation } from '../../lib/types'

interface OrderLineStudioPickerProps {
  orderIds: string[]
  value: StudioLocation | null
  /** 商品預設（僅提示） */
  productDefault: StudioLocation | null
  onSaved: () => void
  onToast: (message: string) => void
}

/** 後台訂單細項：分潤歸屬單選 */
export function OrderLineStudioPicker({
  orderIds,
  value,
  productDefault,
  onSaved,
  onToast,
}: OrderLineStudioPickerProps) {
  const [saving, setSaving] = useState(false)

  const options: { id: StudioLocation | null; label: string }[] = [
    { id: null, label: '未指定' },
    ...STUDIO_LOCATIONS.map((studio) => ({
      id: studio.id as StudioLocation | null,
      label: studio.label,
    })),
  ]

  const handleChange = async (next: StudioLocation | null) => {
    if (saving || next === value || orderIds.length === 0) return
    setSaving(true)
    try {
      await updateOrderLineStudioLocation(orderIds, next)
      onSaved()
      onToast(
        next
          ? `已設定分潤歸屬：${next}`
          : '已清除此筆覆寫（沿用商品預設）'
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新分潤歸屬失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="mt-2 border-t border-white/5 pt-2"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[11px] font-medium tracking-wide text-white/45">
        分潤歸屬
        {saving && <span className="ml-2 text-white/30">儲存中…</span>}
      </p>
      {productDefault && (
        <p className="mt-0.5 text-[10px] text-white/30">
          商品預設：{productDefault}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id ?? 'none'}
            type="button"
            disabled={saving}
            onClick={() => void handleChange(option.id)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition disabled:opacity-50 ${
              value === option.id
                ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/70'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
