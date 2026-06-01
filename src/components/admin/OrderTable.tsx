import { useMemo, useState } from 'react'
import { ChevronDown, Package } from 'lucide-react'
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

/** 訂單明細（同一結帳合併 · 點擊展開細項） */
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
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        同一筆結帳已合併顯示 · 點擊訂單列可展開商品細項
      </p>

      {orderGroups.map((group) => {
        const isExpanded = expandedIds.has(group.id)
        const productSummary =
          group.lineItems.length === 1
            ? `${group.lineItems[0].productName}${group.lineItems[0].quantity > 1 ? ` × ${group.lineItems[0].quantity}` : ''}`
            : `${group.lineItems.length} 種商品，共 ${group.itemCount} 件`

        return (
          <GlassPanel key={group.id} className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => toggleExpanded(group.id)}
              aria-expanded={isExpanded}
              className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                  <Package className="h-4 w-4 text-amber-glow/80" strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{group.buyer_name}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] ${statusClassName(group.status)}`}
                    >
                      {formatOrderGroupStatus(group.status)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-white/70">{productSummary}</p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                    <span>
                      {new Date(group.created_at).toLocaleString('zh-TW')}
                    </span>
                    <span>{group.phone}</span>
                    <span>{group.cvs_brand} · {group.cvs_store}</span>
                    {group.line_name?.trim() && (
                      <span>Line：{group.line_name.trim()}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                <p className="text-lg text-amber-glow">
                  NT$ {Number(group.totalAmount).toLocaleString()}
                </p>
                <span className="flex items-center gap-1 text-xs text-white/40">
                  {isExpanded ? '收合細項' : '展開細項'}
                  <ChevronDown
                    className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-white/10 bg-white/[0.02] px-4 py-4 sm:px-5">
                <p className="mb-3 text-xs tracking-widest text-white/40">商品細項</p>
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
                        <p className="mt-0.5 text-xs text-white/40">數量 {item.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm text-amber-glow">
                        NT$ {Number(item.lineTotal).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>

                {group.pendingOrderIds.length > 0 && (
                  <button
                    type="button"
                    disabled={shippingId === group.id}
                    onClick={() => handleShipGroup(group.id, group.pendingOrderIds)}
                    className="mt-4 rounded border border-amber-glow/40 px-4 py-2 text-sm text-amber-glow transition hover:bg-amber-glow/10 disabled:opacity-50"
                  >
                    {shippingId === group.id ? '處理中…' : '整筆訂單一鍵出貨'}
                  </button>
                )}
              </div>
            )}

            {!isExpanded && group.pendingOrderIds.length > 0 && (
              <div className="border-t border-white/5 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  disabled={shippingId === group.id}
                  onClick={() => handleShipGroup(group.id, group.pendingOrderIds)}
                  className="rounded border border-amber-glow/40 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10 disabled:opacity-50"
                >
                  {shippingId === group.id ? '處理中…' : '一鍵出貨'}
                </button>
              </div>
            )}
          </GlassPanel>
        )
      })}
    </div>
  )
}
