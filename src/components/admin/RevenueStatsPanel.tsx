import { useMemo } from 'react'
import { Banknote, CalendarDays, CircleDollarSign, RefreshCw, Wallet } from 'lucide-react'
import {
  computeRevenueStats,
  formatRevenueAmount,
} from '../../lib/revenueStats'
import type { Order } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { RevenueBarChart } from './RevenueBarChart'
import { RevenueCategoryPieChart } from './RevenueCategoryPieChart'

interface RevenueStatsPanelProps {
  orders: Order[]
  loading: boolean
  onReload: () => void
}

interface StatCardProps {
  label: string
  value: string
  hint: string
  icon: typeof Banknote
  accent?: 'amber' | 'white' | 'emerald' | 'orange'
}

function StatCard({ label, value, hint, icon: Icon, accent = 'amber' }: StatCardProps) {
  const valueClass =
    accent === 'amber'
      ? 'text-amber-glow'
      : accent === 'emerald'
        ? 'text-emerald-300'
        : accent === 'orange'
          ? 'text-orange-300'
          : 'text-white'

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-white/45">{label}</p>
          <p className={`mt-2 font-display text-2xl sm:text-3xl ${valueClass}`}>{value}</p>
          <p className="mt-1 text-xs text-white/35">{hint}</p>
        </div>
        <Icon className="h-7 w-7 shrink-0 text-white/12" strokeWidth={1.25} />
      </div>
    </GlassPanel>
  )
}

/** 後台收入統計（數字 + 圖表） */
export function RevenueStatsPanel({
  orders,
  loading,
  onReload,
}: RevenueStatsPanelProps) {
  const stats = useMemo(() => computeRevenueStats(orders), [orders])

  const monthMax = Math.max(...stats.monthlySeries.map((p) => p.revenue), 1)
  const monthTotal = stats.monthRevenue + stats.monthPendingRevenue
  const paidShare =
    monthTotal > 0 ? Math.round((stats.monthRevenue / monthTotal) * 100) : 0

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg tracking-wide text-white/80">收入統計</h2>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/50 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            strokeWidth={1.5}
          />
          重新整理
        </button>
      </div>

      <p className="mb-4 text-xs text-white/40">
        以「已結帳」訂單計入收入 · 合併訂單依各品項金額拆分品類 · 不含已取消與已刪除
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="累計收入"
          value={loading && orders.length === 0 ? '—' : formatRevenueAmount(stats.totalRevenue)}
          hint={`共 ${stats.paidOrderCount} 筆已結帳`}
          icon={CircleDollarSign}
        />
        <StatCard
          label="本月收入"
          value={loading && orders.length === 0 ? '—' : formatRevenueAmount(stats.monthRevenue)}
          hint={`本月 ${stats.monthPaidCount} 筆已結帳`}
          icon={CalendarDays}
        />
        <StatCard
          label="今日收入"
          value={loading && orders.length === 0 ? '—' : formatRevenueAmount(stats.todayRevenue)}
          hint="台北時區 · 今日已結帳"
          icon={Banknote}
          accent="white"
        />
        <StatCard
          label="待收款"
          value={loading && orders.length === 0 ? '—' : formatRevenueAmount(stats.pendingRevenue)}
          hint={`${stats.pendingOrderCount} 筆未結帳訂單`}
          icon={Wallet}
          accent="orange"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <GlassPanel className="p-5 lg:col-span-3">
          <p className="text-sm font-medium text-white/70">近 6 個月已結帳收入</p>
          <p className="mt-1 text-xs text-white/40">長條高度代表該月收入金額</p>
          <div className="mt-6">
            {loading && orders.length === 0 ? (
              <p className="text-sm text-white/40">載入中…</p>
            ) : (
              <RevenueBarChart data={stats.monthlySeries} />
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 lg:col-span-2">
          <p className="text-sm font-medium text-white/70">本月收款結構</p>
          <p className="mt-1 text-xs text-white/40">已結帳 vs 待收款（依訂單金額）</p>

          <div className="mt-8 space-y-6">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-emerald-300/90">已結帳</span>
                <span className="text-white/55">
                  {formatRevenueAmount(stats.monthRevenue)}（{paidShare}%）
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/50 transition-all duration-500"
                  style={{ width: `${paidShare}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-orange-300/90">待收款</span>
                <span className="text-white/55">
                  {formatRevenueAmount(stats.monthPendingRevenue)}
                  {monthTotal > 0 ? `（${100 - paidShare}%）` : ''}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500/70 to-orange-400/40 transition-all duration-500"
                  style={{ width: `${monthTotal > 0 ? 100 - paidShare : 0}%` }}
                />
              </div>
            </div>
          </div>

          <ul className="mt-8 space-y-2 border-t border-white/10 pt-4 text-xs text-white/45">
            {stats.monthlySeries
              .slice()
              .reverse()
              .map((point) => {
                const width =
                  point.revenue > 0 ? Math.max(6, (point.revenue / monthMax) * 100) : 0
                return (
                  <li key={point.monthKey} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-white/50">{point.label}</span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-amber-glow/60"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-white/60">
                      {formatRevenueAmount(point.revenue)}
                    </span>
                  </li>
                )
              })}
          </ul>
        </GlassPanel>
      </div>

      <GlassPanel className="mt-4 p-5 sm:p-6">
        <p className="text-sm font-medium text-white/70">品類收入比例</p>
        <p className="mt-1 text-xs text-white/40">
          累計已結帳收入 · 手串 / 擺件 / 礦石（依商品品類統計）
        </p>
        <div className="mt-6">
          {loading && orders.length === 0 ? (
            <p className="text-sm text-white/40">載入中…</p>
          ) : (
            <RevenueCategoryPieChart slices={stats.categorySlices} />
          )}
        </div>
      </GlassPanel>
    </section>
  )
}
