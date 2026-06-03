import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountGate } from '../components/account/AccountGate'
import { AdminAccessSection } from '../components/account/AdminAccessSection'
import { GlassPanel } from '../components/ui/GlassPanel'
import { MetalDivider } from '../components/ui/MetalDivider'
import { POINTS_PER_NTD_DISCOUNT, POINTS_PER_NTD_EARN } from '../constants/points'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchMemberOrders,
  fetchPointsHistory,
} from '../lib/api/members'
import {
  formatOrderGroupStatus,
  formatOrderPaymentStatus,
  groupOrders,
} from '../lib/groupOrders'
import { formatPhoneDisplay } from '../lib/phoneAuth'
import type { Order } from '../lib/types'
import type { PointsHistoryEntry } from '../lib/types'

/** 會員中心：點數、點數紀錄、訂單歷史 */
export function AccountPage() {
  const { user, profile, loading, logout, refreshProfile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [history, setHistory] = useState<PointsHistoryEntry[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    setDataLoading(true)

    Promise.all([
      fetchMemberOrders(user.id),
      fetchPointsHistory(user.id),
      refreshProfile(),
    ])
      .then(([orderRows, historyRows]) => {
        if (cancelled) return
        setOrders(orderRows)
        setHistory(historyRows)
      })
      .catch(() => {
        if (!cancelled) {
          setOrders([])
          setHistory([])
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, refreshProfile])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center pt-28 text-white/40">
        載入中…
      </div>
    )
  }

  if (!user || !profile) {
    return <AccountGate />
  }

  const orderGroups = groupOrders(orders)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.4em] text-amber-glow/60">MEMBER</p>
            <h1 className="mt-2 font-display text-4xl text-white">會員中心</h1>
            <p className="mt-2 text-sm text-white/50">
              {profile.real_name} · {formatPhoneDisplay(profile.phone)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm text-white/40 transition hover:text-white/70"
            >
              登出
            </button>
          </div>
        </div>

        <div className="mt-6">
          <AdminAccessSection />
        </div>

        <GlassPanel className="mt-8 overflow-hidden p-0">
          <div className="bg-gradient-to-br from-amber-glow/15 via-transparent to-transparent px-8 py-10 text-center">
            <p className="text-xs tracking-[0.35em] text-amber-glow/70">
              累積點數
            </p>
            <p className="mt-2 font-display text-6xl text-amber-glow">
              {profile.points}
            </p>
            <p className="mt-3 text-xs text-white/40">
              每消費 NT${POINTS_PER_NTD_EARN} 累積 1 點 · 每 {POINTS_PER_NTD_DISCOUNT} 點折 NT$1（訂單上限 10%）· 已付款或已出貨後入帳
            </p>
            <Link
              to="/point-shop"
              className="mt-5 inline-block rounded-lg border border-amber-glow/40 bg-amber-glow/10 px-5 py-2.5 text-sm tracking-wide text-amber-glow transition hover:bg-amber-glow/20"
            >
              前往點數商城兌換
            </Link>
          </div>
        </GlassPanel>

        <GlassPanel className="mt-6 p-6 sm:p-8">
          <h2 className="text-sm tracking-widest text-white/50">點數紀錄</h2>
          {dataLoading && history.length === 0 ? (
            <p className="mt-4 text-sm text-white/35">載入中…</p>
          ) : history.length === 0 ? (
            <p className="mt-4 text-sm text-white/35">尚無點數變動紀錄</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/85">{entry.description}</p>
                    <p className="mt-0.5 text-[11px] text-white/35">
                      {new Date(entry.created_at).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      entry.delta >= 0 ? 'text-emerald-400' : 'text-red-300'
                    }`}
                  >
                    {entry.delta >= 0 ? '+' : ''}
                    {entry.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel className="mt-6 p-6 sm:p-8">
          <h2 className="text-sm tracking-widest text-white/50">訂單紀錄</h2>
          {dataLoading && orderGroups.length === 0 ? (
            <p className="mt-4 text-sm text-white/35">載入中…</p>
          ) : orderGroups.length === 0 ? (
            <p className="mt-4 text-sm text-white/35">
              尚無訂單，前往{' '}
              <Link to="/products" className="text-amber-glow hover:underline">
                典藏選購
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {orderGroups.map((group) => (
                <li
                  key={group.id}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white/90">
                        {group.orderNumber
                          ? `訂單 ${group.orderNumber}`
                          : '訂單'}
                      </p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {new Date(group.created_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-amber-glow">
                        NT$ {group.totalAmount.toLocaleString()}
                      </p>
                      <p className="mt-1 text-white/45">
                        {formatOrderPaymentStatus(group.paymentStatus)} ·{' '}
                        {formatOrderGroupStatus(group.status)}
                      </p>
                    </div>
                  </div>
                  <div className="my-3">
                    <MetalDivider />
                  </div>
                  <ul className="space-y-1.5">
                    {group.lineItems.map((line) => (
                      <li
                        key={`${line.productId}-${line.selectedSize ?? ''}`}
                        className="flex justify-between gap-2 text-sm text-white/70"
                      >
                        <span className="min-w-0 truncate">
                          {line.productName}
                          {line.selectedSize ? ` · ${line.selectedSize}` : ''}
                          {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                        </span>
                        <span className="shrink-0 text-white/45">
                          NT$ {line.lineTotal.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
