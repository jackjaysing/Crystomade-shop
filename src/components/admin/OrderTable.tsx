import { useMemo, useState, type MouseEvent } from 'react'
import {
  formatBraceletSizeLabel,
  formatOrderLineItemDetail,
} from '../../constants/braceletSizes'
import { ChevronDown, Copy, Package, Search, Star, Trash2, X } from 'lucide-react'
import { CopyLineNotifyButton } from './CopyLineNotifyButton'
import { CopyLineVerifyButton } from './CopyLineVerifyButton'
import { OrderTrackingNumberEditor } from './OrderTrackingNumberEditor'
import {
  cancelOrderGroup,
  markOrderGroupPaid,
  markOrderGroupUnpaid,
  shipOrderGroup,
  softDeleteOrderGroup,
  unshipOrderGroup,
} from '../../lib/api/orders'
import {
  formatOrderLineDisplayAmount,
  formatOrderPricingAdjustments,
  orderGroupHasPricingBreakdown,
} from '../../lib/formatOrderPricing'
import { adminProductThumbAlt } from '../../lib/imageAlt'
import { DeleteOrderConfirmModal } from './DeleteOrderConfirmModal'
import { ExportOrdersExcelButton } from './ExportOrdersExcelButton'
import { OrderSoulCardQrPanel } from './OrderSoulCardQrPanel'
import {
  countOrderGroupsByFilter,
  formatOrderGroupStatus,
  formatOrderPaymentStatus,
  groupOrders,
  ORDER_GROUP_FILTERS,
  type OrderGroupFilter,
  type OrderGroupStatus,
} from '../../lib/groupOrders'
import {
  applyOrderGroupListFilters,
  countOrderGroupsInMonth,
  filterOrderGroupsByMonth,
  formatOrderGroupMonthLabel,
  listOrderGroupMonthKeys,
  ORDER_MONTH_ALL,
} from '../../lib/orderGroupFilters'
import type { Order, OrderPaymentStatus } from '../../lib/types'
import { useAdminSession } from '../../hooks/useAdminSession'
import { GlassPanel } from '../ui/GlassPanel'
import { Toast } from '../ui/Toast'

interface OrderTableProps {
  orders: Order[]
  loading: boolean
  onUpdated: (options?: { silent?: boolean }) => void | Promise<void>
  onDeleted?: () => void | Promise<void>
}

function shipStatusClassName(status: OrderGroupStatus): string {
  if (status === 'cancelled') return 'border-white/20 bg-white/5 text-white/50'
  if (status === 'shipped') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
  if (status === 'partial') return 'border-sky-500/40 bg-sky-500/15 text-sky-300'
  return 'border-amber-glow/40 bg-amber-glow/10 text-amber-glow'
}

function paymentStatusClassName(status: OrderPaymentStatus): string {
  if (status === 'paid') return 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
  if (status === 'partial') return 'border-orange-400/40 bg-orange-400/10 text-orange-200'
  return 'border-red-400/50 bg-red-500/15 text-red-200'
}

function panelAccentClassName(
  paymentStatus: OrderPaymentStatus,
  status: OrderGroupStatus
): string {
  if (status === 'cancelled') return 'border-l-[8px] border-l-white/25'
  if (paymentStatus === 'paid') return 'border-l-[8px] border-l-emerald-500/70'
  return 'border-l-[8px] border-l-red-500/60'
}

function OrderNumberBlock({ orderNumber }: { orderNumber: string | null }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!orderNumber) return

    try {
      await navigator.clipboard.writeText(orderNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('無法複製，請手動選取訂單編號')
    }
  }

  return (
    <div className="rounded-lg border border-amber-glow/20 bg-amber-glow/[0.06] px-3 py-2.5">
      <p className="text-xs font-medium tracking-wide text-amber-glow/70">訂單編號</p>
      {orderNumber ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="font-display text-base tracking-wider text-amber-glow sm:text-lg">
            {orderNumber}
          </p>
          <button
            type="button"
            onClick={(e) => void handleCopy(e)}
            className="inline-flex items-center gap-1 rounded border border-amber-glow/30 px-2 py-0.5 text-[11px] text-amber-glow/80 transition hover:bg-amber-glow/10"
          >
            <Copy className="h-3 w-3" strokeWidth={1.5} />
            {copied ? '已複製' : '複製'}
          </button>
        </div>
      ) : (
        <p className="mt-1 text-sm text-white/40">尚未產生（請執行 order_number migration）</p>
      )}
    </div>
  )
}

/** 訂單明細（同一結帳合併 · 點擊展開細項） */
export function OrderTable({ orders, loading, onUpdated, onDeleted }: OrderTableProps) {
  const { isSuperAdmin } = useAdminSession()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [shippingId, setShippingId] = useState<string | null>(null)
  const [unshippingId, setUnshippingId] = useState<string | null>(null)
  const [paymentUpdatingId, setPaymentUpdatingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<OrderGroupFilter>('all')
  const [selectedMonth, setSelectedMonth] = useState(ORDER_MONTH_ALL)
  const [orderNumberSearch, setOrderNumberSearch] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<
    ReturnType<typeof groupOrders>[number] | null
  >(null)
  const [cancelTarget, setCancelTarget] = useState<
    ReturnType<typeof groupOrders>[number] | null
  >(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const orderGroups = useMemo(() => groupOrders(orders), [orders])
  const monthKeys = useMemo(
    () => listOrderGroupMonthKeys(orderGroups),
    [orderGroups]
  )
  const groupsInSelectedMonth = useMemo(
    () => filterOrderGroupsByMonth(orderGroups, selectedMonth),
    [orderGroups, selectedMonth]
  )
  const filterCounts = useMemo(
    () => countOrderGroupsByFilter(groupsInSelectedMonth),
    [groupsInSelectedMonth]
  )
  const filteredGroups = useMemo(
    () =>
      applyOrderGroupListFilters(orderGroups, {
        monthKey: selectedMonth,
        searchQuery: orderNumberSearch,
        statusFilter: activeFilter,
      }),
    [orderGroups, selectedMonth, orderNumberSearch, activeFilter]
  )

  const hasSearchOrMonthFilter =
    orderNumberSearch.trim().length > 0 || selectedMonth !== ORDER_MONTH_ALL

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

  const handleUnshipGroup = async (groupId: string, shippedOrderIds: string[]) => {
    if (!confirm('確定改回未出貨？')) return
    setUnshippingId(groupId)
    try {
      await unshipOrderGroup(shippedOrderIds)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setUnshippingId(null)
    }
  }

  const handleMarkPaid = async (groupId: string, orderIds: string[]) => {
    setPaymentUpdatingId(groupId)
    try {
      await markOrderGroupPaid(orderIds)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '標記付款失敗')
    } finally {
      setPaymentUpdatingId(null)
    }
  }

  const handleMarkUnpaid = async (groupId: string, orderIds: string[]) => {
    if (!confirm('確定改回未付款？')) return
    setPaymentUpdatingId(groupId)
    try {
      await markOrderGroupUnpaid(orderIds)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setPaymentUpdatingId(null)
    }
  }

  const handleCancelGroup = async (groupId: string, orderIds: string[]) => {
    setCancellingId(groupId)
    try {
      await cancelOrderGroup(orderIds)
      setCancelTarget(null)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '取消失敗')
    } finally {
      setCancellingId(null)
    }
  }

  const canDeleteGroup = (group: ReturnType<typeof groupOrders>[number]) =>
    group.shippedOrderIds.length === 0

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await softDeleteOrderGroup(deleteTarget.orderIds)
      setDeleteTarget(null)
      await onUpdated({ silent: true })
      await onDeleted?.()
      setToastMessage('已刪除訂單')
    } catch (e) {
      alert(e instanceof Error ? e.message : '刪除失敗')
    } finally {
      setDeletingId(null)
    }
  }

  const renderCopyButtons = (group: ReturnType<typeof groupOrders>[number]) => (
    <>
      <CopyLineVerifyButton
        group={group}
        onCopied={() => setToastMessage('已複製核對訊息！')}
        onCopyFailed={() =>
          alert('無法複製，請確認瀏覽器已允許剪貼簿權限')
        }
      />
      <CopyLineNotifyButton
        group={group}
        onCopied={() => setToastMessage('已複製出貨通知訊息！')}
        onCopyFailed={() =>
          alert('無法複製，請確認瀏覽器已允許剪貼簿權限')
        }
      />
    </>
  )

  const renderDeleteButton = (group: ReturnType<typeof groupOrders>[number]) => {
    if (!isSuperAdmin || !canDeleteGroup(group)) return null
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setDeleteTarget(group)
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        刪除訂單
      </button>
    )
  }

  const renderActionButtons = (group: ReturnType<typeof groupOrders>[number]) => {
    const isUpdatingPayment = paymentUpdatingId === group.id
    const isShipping = shippingId === group.id
    const isUnshipping = unshippingId === group.id
    const isCancelling = cancellingId === group.id
    const isCancelled = group.status === 'cancelled'

    if (isCancelled) {
      return (
        <div className="order-admin-actions w-full">
          <div className="flex flex-wrap gap-2">
            {renderCopyButtons(group)}
            {renderDeleteButton(group)}
          </div>
        </div>
      )
    }

    return (
      <div className="order-admin-actions w-full">
        <OrderTrackingNumberEditor
          orderIds={group.orderIds}
          savedTrackingNumber={group.trackingNumber}
          onSaved={() => void onUpdated({ silent: true })}
          onToast={setToastMessage}
        />
        <div className="flex flex-wrap gap-2">
        {renderCopyButtons(group)}
        {group.paymentStatus !== 'paid' && (
          <button
            type="button"
            disabled={isUpdatingPayment}
            onClick={(e) => {
              e.stopPropagation()
              void handleMarkPaid(group.id, group.orderIds)
            }}
            className="rounded border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {isUpdatingPayment ? '處理中…' : '標記已付款'}
          </button>
        )}
        {group.paymentStatus === 'paid' && (
          <button
            type="button"
            disabled={isUpdatingPayment}
            onClick={(e) => {
              e.stopPropagation()
              void handleMarkUnpaid(group.id, group.orderIds)
            }}
            className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/50 transition hover:border-white/30 hover:text-white/70 disabled:opacity-50"
          >
            {isUpdatingPayment ? '處理中…' : '改回未付款'}
          </button>
        )}
        {group.pendingOrderIds.length > 0 && (
          <button
            type="button"
            disabled={isShipping}
            onClick={(e) => {
              e.stopPropagation()
              void handleShipGroup(group.id, group.pendingOrderIds)
            }}
            className="rounded border border-amber-glow/40 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10 disabled:opacity-50"
          >
            {isShipping ? '處理中…' : '一鍵出貨'}
          </button>
        )}
        {group.shippedOrderIds.length > 0 && (
          <button
            type="button"
            disabled={isUnshipping}
            onClick={(e) => {
              e.stopPropagation()
              void handleUnshipGroup(group.id, group.shippedOrderIds)
            }}
            className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/50 transition hover:border-white/30 hover:text-white/70 disabled:opacity-50"
          >
            {isUnshipping ? '處理中…' : '改回未出貨'}
          </button>
        )}
        {isSuperAdmin && group.pendingOrderIds.length > 0 && (
          <button
            type="button"
            disabled={isCancelling}
            onClick={(e) => {
              e.stopPropagation()
              setCancelTarget(group)
            }}
            className="rounded border border-red-400/40 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {isCancelling ? '處理中…' : '取消訂單'}
          </button>
        )}
        {renderDeleteButton(group)}
        </div>
      </div>
    )
  }

  if (loading && orders.length === 0) {
    return <p className="text-white/50">載入訂單中…</p>
  }

  const emptyFilterHint = (() => {
    if (orderNumberSearch.trim()) {
      return `找不到符合「${orderNumberSearch.trim()}」的訂單編號`
    }
    if (selectedMonth !== ORDER_MONTH_ALL) {
      const statusLabel =
        ORDER_GROUP_FILTERS.find((filter) => filter.id === activeFilter)?.label ??
        ''
      if (activeFilter === 'all') {
        return `${formatOrderGroupMonthLabel(selectedMonth)}目前沒有訂單`
      }
      return `${formatOrderGroupMonthLabel(selectedMonth)}的「${statusLabel}」目前沒有訂單`
    }
    return `${
      ORDER_GROUP_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? ''
    }分類目前沒有訂單`
  })()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={orderNumberSearch}
            onChange={(e) => setOrderNumberSearch(e.target.value)}
            placeholder="搜尋訂單編號…"
            className="input-field w-full pl-10 pr-10 text-sm"
            autoComplete="off"
          />
          {orderNumberSearch.trim() && (
            <button
              type="button"
              onClick={() => setOrderNumberSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:text-white/70"
              aria-label="清除搜尋"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <ExportOrdersExcelButton
          groups={filteredGroups}
          disabled={loading || filteredGroups.length === 0}
        />
      </div>

      {monthKeys.length > 0 && (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <p className="mb-2 text-xs text-white/45">依下單月份</p>
          <div className="flex min-w-max flex-nowrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonth(ORDER_MONTH_ALL)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm tracking-wide transition ${
                selectedMonth === ORDER_MONTH_ALL
                  ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
                  : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
              }`}
            >
              {formatOrderGroupMonthLabel(ORDER_MONTH_ALL)}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                  selectedMonth === ORDER_MONTH_ALL
                    ? 'bg-amber-glow/20 text-amber-glow'
                    : 'bg-white/5 text-white/40'
                }`}
              >
                {orderGroups.length}
              </span>
            </button>
            {monthKeys.map((monthKey) => {
              const isActive = selectedMonth === monthKey
              const count = countOrderGroupsInMonth(orderGroups, monthKey)

              return (
                <button
                  key={monthKey}
                  type="button"
                  onClick={() => setSelectedMonth(monthKey)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm tracking-wide transition ${
                    isActive
                      ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
                      : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                  }`}
                >
                  {formatOrderGroupMonthLabel(monthKey)}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                      isActive
                        ? 'bg-amber-glow/20 text-amber-glow'
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max flex-nowrap items-center gap-2">
          {ORDER_GROUP_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id
            const count = filterCounts[filter.id]

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm tracking-wide transition ${
                  isActive
                    ? 'border-amber-glow/60 bg-amber-glow/10 text-amber-glow'
                    : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                }`}
              >
                {filter.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                    isActive ? 'bg-amber-glow/20 text-amber-glow' : 'bg-white/5 text-white/40'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-white/40">
        同一筆結帳已合併顯示 · 已結帳＝已付款 · ★ 超過 7 天未結帳 · 取消訂單會還庫存
      </p>

      {orderGroups.length === 0 && <p className="text-white/50">尚無訂單</p>}

      {orderGroups.length > 0 && filteredGroups.length === 0 && (
        <p className="text-white/50">{emptyFilterHint}</p>
      )}

      {filteredGroups.length > 0 && hasSearchOrMonthFilter && (
        <p className="text-xs text-white/40">
          顯示 {filteredGroups.length} 筆訂單
          {orderNumberSearch.trim() ? ` · 編號含「${orderNumberSearch.trim()}」` : ''}
          {selectedMonth !== ORDER_MONTH_ALL
            ? ` · ${formatOrderGroupMonthLabel(selectedMonth)}`
            : ''}
        </p>
      )}

      <div className="space-y-3">
      {filteredGroups.map((group) => {
        const isExpanded = expandedIds.has(group.id)
        const productSummary =
          group.lineItems.length === 1
            ? formatOrderLineItemDetail(group.lineItems[0])
            : `${group.lineItems.length} 種商品，共 ${group.itemCount} 件`

        return (
          <GlassPanel
            key={group.id}
            className={`overflow-hidden p-0 ${panelAccentClassName(group.paymentStatus, group.status)}`}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpanded(group.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleExpanded(group.id)
                }
              }}
              aria-expanded={isExpanded}
              className="flex w-full cursor-pointer flex-col gap-4 p-4 text-left transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                  <Package className="h-4 w-4 text-amber-glow/80" strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <OrderNumberBlock orderNumber={group.orderNumber} />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {group.isOverdueUnpaid && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-orange-400/50 bg-orange-400/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-200"
                        title={`超過 ${group.unpaidDays} 天未結帳`}
                      >
                        <Star className="h-3 w-3 fill-orange-300 text-orange-300" />
                        超過 {group.unpaidDays} 天未結帳
                      </span>
                    )}
                    <p className="font-medium text-white">{group.buyer_name}</p>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${paymentStatusClassName(group.paymentStatus)}`}
                    >
                      {formatOrderPaymentStatus(group.paymentStatus)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] ${shipStatusClassName(group.status)}`}
                    >
                      {formatOrderGroupStatus(group.status)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-white/70">{productSummary}</p>

                  <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-xs font-medium tracking-wide text-amber-glow/70">
                      收貨資訊
                    </p>
                    <div className="mt-1.5 space-y-1">
                      <p className="text-sm text-white/90">
                        <span className="text-white/50">電話 · </span>
                        {group.phone}
                      </p>
                      <p className="text-sm text-white/90">
                        <span className="text-white/50">超商 · </span>
                        {group.cvs_brand} · {group.cvs_store}
                      </p>
                      {group.line_name?.trim() && (
                        <p className="text-sm text-white/90">
                          <span className="text-white/50">Line · </span>
                          {group.line_name.trim()}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-white/40">
                    下單時間 {new Date(group.created_at).toLocaleString('zh-TW')}
                  </p>
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
            </div>

            {isExpanded && (
              <div className="border-t border-white/10 bg-white/[0.02] px-4 py-4 sm:px-5">
                <p className="mb-3 text-xs tracking-widest text-white/40">商品細項</p>
                <ul className="space-y-2">
                  {group.lineItems.map((item) => (
                    <li
                      key={`${item.productId}-${item.selectedSize ?? ''}`}
                      className="flex items-center gap-4 rounded-lg border border-white/5 bg-void/40 p-3"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={adminProductThumbAlt(item.productName)}
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-white/5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{item.productName}</p>
                        {item.selectedSize && (
                          <p className="mt-1 text-[11px] text-amber-glow/80">
                            {formatBraceletSizeLabel(item.selectedSize)}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-white/40">數量 {item.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm text-amber-glow">
                        NT$ {formatOrderLineDisplayAmount(item)}
                      </p>
                    </li>
                  ))}
                </ul>

                {orderGroupHasPricingBreakdown(group) && (
                  <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                    {formatOrderPricingAdjustments(group).map((line) => (
                      <li
                        key={line}
                        className="flex justify-end text-sm text-white/60"
                      >
                        {line}
                      </li>
                    ))}
                    <li className="flex justify-end text-sm font-medium text-amber-glow">
                      合計 NT$ {Number(group.totalAmount).toLocaleString('zh-TW')}
                    </li>
                  </ul>
                )}

                <div className="mt-4">{renderActionButtons(group)}</div>

                <OrderSoulCardQrPanel
                  orderIds={group.orderIds}
                  paid={group.paymentStatus === 'paid'}
                />
              </div>
            )}

            {!isExpanded && (
              <div className="border-t border-white/5 px-4 py-3 sm:px-5">
                {renderActionButtons(group)}
              </div>
            )}
          </GlassPanel>
        )
      })}
      </div>

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={() => setCancelTarget(null)}
            aria-label="關閉"
          />
          <GlassPanel className="relative z-10 w-full max-w-md p-6">
            <h2 id="cancel-order-title" className="font-display text-lg text-red-200">
              取消訂單
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              確定取消此訂單？將標記為「訂單未完成」並把商品庫存加回去。
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancellingId === cancelTarget.id}
                className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-white/60 transition hover:text-white/80 disabled:opacity-40"
              >
                返回
              </button>
              <button
                type="button"
                disabled={cancellingId === cancelTarget.id}
                onClick={() =>
                  void handleCancelGroup(cancelTarget.id, cancelTarget.pendingOrderIds)
                }
                className="flex-1 rounded-lg border border-red-400/50 bg-red-500/15 py-2.5 text-sm text-red-200 transition hover:bg-red-500/25 disabled:opacity-40"
              >
                {cancellingId === cancelTarget.id ? '處理中…' : '確認取消'}
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {deleteTarget && (
        <DeleteOrderConfirmModal
          group={deleteTarget}
          deleting={deletingId === deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  )
}
