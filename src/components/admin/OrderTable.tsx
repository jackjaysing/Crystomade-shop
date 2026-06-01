import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { shipOrderGroup } from '../../lib/api/orders'
import {
  formatOrderGroupStatus,
  groupOrders,
  type OrderGroupStatus,
} from '../../lib/groupOrders'
import type { Order } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface OrderTableProps {
  orders: Order[]
  loading: boolean
  onUpdated: () => void
}

function statusClassName(status: OrderGroupStatus): string {
  if (status === 'shipped') return 'bg-emerald-500/20 text-emerald-400'
  if (status === 'partial') return 'bg-sky-500/20 text-sky-300'
  return 'bg-amber-glow/10 text-amber-glow'
}

/** 訂單明細表格（同一結帳合併顯示） */
export function OrderTable({ orders, loading, onUpdated }: OrderTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [shippingId, setShippingId] = useState<string | null>(null)

  const orderGroups = useMemo(() => groupOrders(orders), [orders])

  const toggleExpanded = (groupId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const handleShipGroup = async (groupId: string, pendingOrderIds: string[]) => {
    setShippingId(groupId)
    try {
      await shipOrderGroup(pendingOrderIds)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setShippingId(null)
    }
  }

  if (loading) {
    return <p className="text-white/50">載入訂單中…</p>
  }

  if (orderGroups.length === 0) {
    return <p className="text-white/50">尚無訂單</p>
  }

  return (
    <GlassPanel className="overflow-x-auto p-0">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            <th className="w-10 p-4 font-normal" />
            <th className="p-4 font-normal">下單時間</th>
            <th className="p-4 font-normal">買家</th>
            <th className="p-4 font-normal">Line</th>
            <th className="p-4 font-normal">電話</th>
            <th className="p-4 font-normal">超商</th>
            <th className="p-4 font-normal">門市</th>
            <th className="p-4 font-normal">品項</th>
            <th className="p-4 font-normal">金額</th>
            <th className="p-4 font-normal">狀態</th>
            <th className="p-4 font-normal">操作</th>
          </tr>
        </thead>
        <tbody>
          {orderGroups.map((group) => {
            const isExpanded = expandedIds.has(group.id)
            const productSummary =
              group.lineItems.length === 1
                ? `${group.lineItems[0].productName}${group.lineItems[0].quantity > 1 ? ` ×${group.lineItems[0].quantity}` : ''}`
                : `${group.lineItems.length} 種商品 · 共 ${group.itemCount} 件`

            return (
              <Fragment key={group.id}>
                <tr
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.02]"
                  onClick={() => toggleExpanded(group.id)}
                >
                  <td className="p-4 text-white/40">
                    <ChevronDown
                      className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </td>
                  <td className="p-4 text-white/70">
                    {new Date(group.created_at).toLocaleString('zh-TW')}
                  </td>
                  <td className="p-4">{group.buyer_name}</td>
                  <td className="p-4 text-white/60">
                    {group.line_name?.trim() || '—'}
                  </td>
                  <td className="p-4 text-white/70">{group.phone}</td>
                  <td className="p-4 text-white/70">{group.cvs_brand}</td>
                  <td
                    className="max-w-[180px] p-4 text-white/70"
                    title={group.cvs_store}
                  >
                    {group.cvs_store}
                  </td>
                  <td className="max-w-[220px] p-4 text-white/80">{productSummary}</td>
                  <td className="p-4 text-amber-glow">
                    NT$ {Number(group.totalAmount).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${statusClassName(group.status)}`}
                    >
                      {formatOrderGroupStatus(group.status)}
                    </span>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    {group.pendingOrderIds.length > 0 && (
                      <button
                        type="button"
                        disabled={shippingId === group.id}
                        onClick={() =>
                          handleShipGroup(group.id, group.pendingOrderIds)
                        }
                        className="rounded border border-amber-glow/40 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10 disabled:opacity-50"
                      >
                        {shippingId === group.id ? '處理中…' : '一鍵出貨'}
                      </button>
                    )}
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <td colSpan={11} className="p-4">
                      <p className="mb-3 text-xs tracking-widest text-white/40">
                        訂單明細
                      </p>
                      <ul className="space-y-2">
                        {group.lineItems.map((item) => (
                          <li
                            key={item.productId}
                            className="flex items-center gap-4 rounded-lg border border-white/5 bg-void/40 p-3"
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-14 w-14 shrink-0 rounded-lg bg-white/5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-white">{item.productName}</p>
                              <p className="mt-0.5 text-xs text-white/40">
                                數量 {item.quantity}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm text-amber-glow">
                              NT$ {Number(item.lineTotal).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </GlassPanel>
  )
}
