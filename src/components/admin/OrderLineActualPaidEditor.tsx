import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { updateOrderLineActualPaid } from '../../lib/api/orders'
import type { OrderGroup, OrderLineItem } from '../../lib/groupOrders'
import { resolveLineMerchandiseRevenues } from '../../lib/actualPaidAllocation'

interface OrderLineActualPaidEditorProps {
  group: OrderGroup
  item: OrderLineItem
  disabled?: boolean
  onSaved: () => void
  onToast: (message: string) => void
}

function formatNtd(amount: number): string {
  return `NT$ ${Math.round(amount).toLocaleString('zh-TW')}`
}

/** 後台：單一商品細項的商品實收（不含運費） */
export function OrderLineActualPaidEditor({
  group,
  item,
  disabled,
  onSaved,
  onToast,
}: OrderLineActualPaidEditorProps) {
  const revenues = resolveLineMerchandiseRevenues(group)
  const index = group.lineItems.findIndex(
    (line) =>
      line.orderIds.length === item.orderIds.length &&
      line.orderIds.every((id, i) => id === item.orderIds[i])
  )
  const current =
    item.lineActualPaidNtd != null && item.lineActualPaidNtd >= 0
      ? Math.round(item.lineActualPaidNtd)
      : Math.round(revenues[index] ?? 0)

  const [value, setValue] = useState(String(current))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(String(current))
  }, [current])

  const handleSave = async (e: FormEvent | MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || saving) return

    const n = Number(value.trim().replace(/,/g, ''))
    if (!Number.isFinite(n) || n < 0) {
      alert('請輸入有效的品項實收（0 或以上）')
      return
    }

    setSaving(true)
    try {
      await updateOrderLineActualPaid(
        group.orderIds,
        item.orderIds,
        Math.round(n),
        group.shippingFeeNtd
      )
      onSaved()
      onToast(`已更新「${item.productName}」品項實收 ${formatNtd(n)}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2"
      onSubmit={(e) => void handleSave(e)}
      onClick={(e) => e.stopPropagation()}
    >
      <label className="text-[11px] tracking-wide text-white/45">品項實收</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || saving}
        className="input-field w-28 text-xs"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={disabled || saving}
        className="rounded border border-emerald-500/35 px-2.5 py-1 text-[11px] text-emerald-200/90 transition hover:bg-emerald-500/10 disabled:opacity-50"
      >
        {saving ? '…' : '儲存'}
      </button>
      {item.lineActualPaidNtd != null && item.lineActualPaidNtd >= 0 && (
        <span className="text-[10px] text-emerald-300/70">已手動設定</span>
      )}
    </form>
  )
}
