import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { PackageCheck } from 'lucide-react'
import { updateOrderGroupTrackingNumber } from '../../lib/api/orders'

interface OrderTrackingNumberEditorProps {
  orderIds: string[]
  savedTrackingNumber: string | null
  disabled?: boolean
  onSaved: () => void
  onToast: (message: string) => void
}

/** 後台：輸入並儲存寄件單號（供出貨通知罐頭訊息使用） */
export function OrderTrackingNumberEditor({
  orderIds,
  savedTrackingNumber,
  disabled,
  onSaved,
  onToast,
}: OrderTrackingNumberEditorProps) {
  const [value, setValue] = useState(savedTrackingNumber ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(savedTrackingNumber ?? '')
  }, [savedTrackingNumber])

  const handleSave = async (e: FormEvent | MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || saving) return

    setSaving(true)
    try {
      await updateOrderGroupTrackingNumber(orderIds, value)
      onSaved()
      onToast('已儲存寄件單號')
    } catch (err) {
      alert(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="mb-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4"
      onSubmit={(e) => void handleSave(e)}
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-amber-glow/70">
        <PackageCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
        寄件單號
      </label>
      <p className="mt-1 text-[11px] text-white/40">
        儲存後，「複製出貨通知」會自動帶入；未填寫則顯示「安排出貨中」
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || saving}
          placeholder="例：1234567890123"
          className="input-field min-w-0 flex-1 text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={disabled || saving}
          className="shrink-0 rounded-lg border border-amber-glow/40 px-4 py-2 text-xs text-amber-glow transition hover:bg-amber-glow/10 disabled:opacity-50"
        >
          {saving ? '儲存中…' : '儲存單號'}
        </button>
      </div>
    </form>
  )
}
