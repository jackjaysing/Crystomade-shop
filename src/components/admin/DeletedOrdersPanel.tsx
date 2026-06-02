import { useMemo, useState } from 'react'
import { Archive, RotateCcw } from 'lucide-react'
import { restoreOrderGroup } from '../../lib/api/orders'
import { formatOrderDisplayId } from '../../lib/buildLineOrderNotification'
import { formatOrderLineItemDetail } from '../../constants/braceletSizes'
import {
  formatOrderGroupStatus,
  formatOrderPaymentStatus,
  groupOrders,
} from '../../lib/groupOrders'
import { useDeletedOrders } from '../../hooks/useDeletedOrders'
import { GlassPanel } from '../ui/GlassPanel'

interface DeletedOrdersPanelProps {
  enabled: boolean
  onRestored: () => void
}

/** 已刪除訂單列表 · 可一鍵恢復 */
export function DeletedOrdersPanel({
  enabled,
  onRestored,
}: DeletedOrdersPanelProps) {
  const { orders, loading, error, reload } = useDeletedOrders(enabled)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const orderGroups = useMemo(() => groupOrders(orders), [orders])

  const handleRestore = async (groupId: string, orderIds: string[]) => {
    if (
      !confirm(
        '確定要恢復此訂單？\n\n訂單將回到訂單管理列表；若刪除前為待出貨，會重新扣庫存。'
      )
    ) {
      return
    }

    setRestoringId(groupId)
    try {
      await restoreOrderGroup(orderIds)
      await reload()
      onRestored()
    } catch (e) {
      alert(e instanceof Error ? e.message : '恢復失敗')
    } finally {
      setRestoringId(null)
    }
  }

  if (loading) {
    return <p className="text-white/50">載入已刪除訂單中…</p>
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (orderGroups.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
        尚無已刪除訂單
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        已刪除訂單不會出現在訂單管理；點「恢復訂單」可還原。
      </p>
      {orderGroups.map((group) => {
        const deletedAt = orders.find((o) => o.id === group.orderIds[0])?.deleted_at
        const isRestoring = restoringId === group.id

        return (
          <GlassPanel key={group.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-amber-glow/80">
                  <Archive className="h-4 w-4" strokeWidth={1.5} />
                  <p className="font-display text-base tracking-wider text-amber-glow">
                    {formatOrderDisplayId(group)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-white/80">{group.buyer_name}</p>
                <p className="mt-1 text-xs text-white/45">
                  {group.lineItems
                    .map((item) => formatOrderLineItemDetail(item))
                    .join('、')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/50">
                    {formatOrderPaymentStatus(group.paymentStatus)}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/50">
                    {formatOrderGroupStatus(group.status)}
                  </span>
                </div>
                {deletedAt && (
                  <p className="mt-2 text-xs text-white/35">
                    刪除時間 {new Date(deletedAt).toLocaleString('zh-TW')}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={isRestoring}
                onClick={() => void handleRestore(group.id, group.orderIds)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                {isRestoring ? '恢復中…' : '恢復訂單'}
              </button>
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}
