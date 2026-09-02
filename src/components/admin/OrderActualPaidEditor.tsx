import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { Banknote } from 'lucide-react'
import { updateOrderGroupActualPaid } from '../../lib/api/orders'
import type { OrderGroup } from '../../lib/groupOrders'

interface OrderActualPaidEditorProps {
  group: OrderGroup
  disabled?: boolean
  onSaved: () => void
  onToast: (message: string) => void
}

function formatNtd(amount: number): string {
  return `NT$ ${Math.round(amount).toLocaleString('zh-TW')}`
}

/** 後台：記錄買家實際付款（消費贈點依此計算） */
export function OrderActualPaidEditor({
  group,
  disabled,
  onSaved,
  onToast,
}: OrderActualPaidEditorProps) {
  const saved =
    group.actualPaidNtd != null && group.actualPaidNtd >= 0
      ? String(Math.round(group.actualPaidNtd))
      : ''
  const [value, setValue] = useState(saved)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(saved)
  }, [saved])

  const expectedPoints = Math.floor(group.payableNtd / 5)

  const handleSave = async (e: FormEvent | MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || saving) return

    const trimmed = value.trim()
    let parsed: number | null = null
    if (trimmed) {
      const n = Number(trimmed.replace(/,/g, ''))
      if (!Number.isFinite(n) || n < 0) {
        alert('請輸入有效的金額（0 或以上）')
        return
      }
      parsed = Math.round(n)
    }

    setSaving(true)
    try {
      await updateOrderGroupActualPaid(group.orderIds, parsed)
      onSaved()
      onToast(
        parsed != null
          ? `已儲存實際收款 ${formatNtd(parsed)}`
          : '已清除實際收款'
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleUseOrderTotal = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setValue(String(Math.round(group.orderTotalNtd)))
  }

  return (
    <form
      className="mb-3 w-full rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-3 sm:px-4"
      onSubmit={(e) => void handleSave(e)}
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-emerald-200/90">
        <Banknote className="h-3.5 w-3.5" strokeWidth={1.5} />
        實際收款
      </label>
      <p className="mt-1 text-[11px] leading-relaxed text-white/45">
        官網訂單金額為 {formatNtd(group.orderTotalNtd)}。若事後再折扣給買家，請填實際入帳金額；
        消費贈點將依此計算（約每 NT$5 累 1 點，目前基準約 {expectedPoints} 點）。
        建議在「標記已付款」前先填寫。
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || saving}
          placeholder={`訂單金額 ${Math.round(group.orderTotalNtd)}`}
          className="input-field min-w-0 flex-1 text-sm"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || saving}
            onClick={handleUseOrderTotal}
            className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/55 transition hover:border-white/30 hover:text-white/80 disabled:opacity-50"
          >
            帶入訂單金額
          </button>
          <button
            type="submit"
            disabled={disabled || saving}
            className="shrink-0 rounded-lg border border-emerald-500/45 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {saving ? '儲存中…' : '儲存實際收款'}
          </button>
        </div>
      </div>
      {group.actualPaidNtd != null &&
        group.actualPaidNtd >= 0 &&
        group.actualPaidNtd !== group.orderTotalNtd && (
          <p className="mt-2 text-[11px] text-amber-glow/80">
            已設定實際收款 {formatNtd(group.actualPaidNtd)}（與訂單金額差
            {formatNtd(group.orderTotalNtd - group.actualPaidNtd)}）
          </p>
        )}
    </form>
  )
}
