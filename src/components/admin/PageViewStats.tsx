import { useMemo, useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel'
import type {
  PageViewStats as PageViewStatsData,
  PageViewTimeSlot,
  ProductViewStats,
} from '../../lib/api/analytics'
import type { Product } from '../../lib/types'
import {
  buildBrowseHeatmapCells,
  buildProductViewRanking,
  type ProductViewMetric,
} from '../../lib/browseAnalytics'
import { ProductViewRankChart } from './ProductViewRankChart'
import { BrowseTimeHeatmap } from './BrowseTimeHeatmap'
import { BrowseWeekdayHourCharts } from './BrowseWeekdayHourCharts'

interface PageViewStatsProps {
  stats: PageViewStatsData | null
  products: Product[]
  productViewStats: ProductViewStats[]
  productViewError: string | null
  timeSlots: PageViewTimeSlot[]
  timeSlotError: string | null
  loading: boolean
  error: string | null
  onReload: () => void
}

function formatCount(value: number): string {
  return value.toLocaleString('zh-TW')
}

/** 後台瀏覽統計（總覽、商品排行、時段熱力圖） */
export function PageViewStats({
  stats,
  products,
  productViewStats,
  productViewError,
  timeSlots,
  timeSlotError,
  loading,
  error,
  onReload,
}: PageViewStatsProps) {
  const [productMetric, setProductMetric] = useState<ProductViewMetric>('total')

  const productRanking = useMemo(
    () => buildProductViewRanking(products, productViewStats, productMetric),
    [products, productViewStats, productMetric]
  )

  const heatmapCells = useMemo(
    () => buildBrowseHeatmapCells(timeSlots),
    [timeSlots]
  )

  const migrationHint = (
    <p className="mt-2 text-xs text-white/45">
      請在 Supabase SQL Editor 執行{' '}
      <code className="text-white/60">migration-add-page-views.sql</code>、{' '}
      <code className="text-white/60">migration-add-product-views.sql</code>
      {' '}與{' '}
      <code className="text-white/60">migration-add-browse-time-slots.sql</code>
    </p>
  )

  return (
    <section className="w-full space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg tracking-wide text-white/80">瀏覽統計</h2>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/50 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          重新整理
        </button>
      </div>

      {error && (
        <GlassPanel className="border-amber-glow/20 p-5">
          <p className="text-sm text-amber-glow/90">無法載入瀏覽統計：{error}</p>
          {migrationHint}
        </GlassPanel>
      )}

      {!error && (
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassPanel className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-wide text-white/45 md:text-sm">當日瀏覽次數</p>
                <p className="mt-2 font-display text-4xl text-amber-glow md:text-5xl">
                  {loading && !stats ? '—' : formatCount(stats?.todayCount ?? 0)}
                </p>
                <p className="mt-1 text-xs text-white/35">台北時區 · 今日累計</p>
              </div>
              <Eye className="h-8 w-8 shrink-0 text-white/15" strokeWidth={1.25} />
            </div>
          </GlassPanel>

          <GlassPanel className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-wide text-white/45 md:text-sm">總瀏覽次數</p>
                <p className="mt-2 font-display text-4xl text-white md:text-5xl">
                  {loading && !stats ? '—' : formatCount(stats?.totalCount ?? 0)}
                </p>
                <p className="mt-1 text-xs text-white/35">自啟用統計以來</p>
              </div>
              <Eye className="h-8 w-8 shrink-0 text-white/15" strokeWidth={1.25} />
            </div>
          </GlassPanel>
        </div>
      )}

      <GlassPanel className="w-full p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
          <div>
            <h3 className="font-display text-lg text-white md:text-xl">商品瀏覽排行</h3>
            <p className="mt-1 text-xs text-white/40 md:text-sm">
              依各商品被開啟詳情的次數排序（前 15 名）
            </p>
          </div>
          <div className="flex rounded-full border border-white/10 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setProductMetric('today')}
              className={`rounded-full px-3 py-1.5 transition ${
                productMetric === 'today'
                  ? 'bg-amber-glow/20 text-amber-glow'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              今日
            </button>
            <button
              type="button"
              onClick={() => setProductMetric('total')}
              className={`rounded-full px-3 py-1.5 transition ${
                productMetric === 'total'
                  ? 'bg-amber-glow/20 text-amber-glow'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              累計
            </button>
          </div>
        </div>

        {productViewError ? (
          <>
            <p className="text-sm text-amber-glow/90">
              無法載入商品瀏覽排行：{productViewError}
            </p>
            {migrationHint}
          </>
        ) : (
          <ProductViewRankChart
            rows={productRanking}
            metricLabel={productMetric === 'today' ? '今日' : '累計'}
          />
        )}
      </GlassPanel>

      <GlassPanel className="w-full p-6 md:p-8">
        <div className="mb-4 md:mb-6">
          <h3 className="font-display text-lg text-white md:text-xl">瀏覽時段分析</h3>
          <p className="mt-1 text-xs text-white/40 md:text-sm">
            訪客在星期幾、幾點瀏覽前台（台北時區，自啟用時段統計後累計）
            <span className="md:hidden"> · 手機可左右滑動查看熱力圖</span>
          </p>
        </div>

        {timeSlotError ? (
          <>
            <p className="text-sm text-amber-glow/90">
              無法載入瀏覽時段：{timeSlotError}
            </p>
            {migrationHint}
          </>
        ) : (
          <div className="space-y-6">
            <BrowseTimeHeatmap cells={heatmapCells} />
            <BrowseWeekdayHourCharts cells={heatmapCells} />
          </div>
        )}
      </GlassPanel>
    </section>
  )
}
