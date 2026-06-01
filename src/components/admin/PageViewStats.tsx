import { Eye, RefreshCw } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel'
import type { PageViewStats as PageViewStatsData } from '../../lib/api/analytics'

interface PageViewStatsProps {
  stats: PageViewStatsData | null
  loading: boolean
  error: string | null
  onReload: () => void
}

function formatCount(value: number): string {
  return value.toLocaleString('zh-TW')
}

/** 後台瀏覽次數統計卡片 */
export function PageViewStats({ stats, loading, error, onReload }: PageViewStatsProps) {
  return (
    <section className="mb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
          <p className="mt-2 text-xs text-white/45">
            請在 Supabase SQL Editor 執行{' '}
            <code className="text-white/60">migration-add-page-views.sql</code>
            {' '}與{' '}
            <code className="text-white/60">migration-add-product-views.sql</code>
          </p>
        </GlassPanel>
      )}

      {!error && (
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassPanel className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-wide text-white/45">當日瀏覽次數</p>
                <p className="mt-2 font-display text-4xl text-amber-glow">
                  {loading && !stats ? '—' : formatCount(stats?.todayCount ?? 0)}
                </p>
                <p className="mt-1 text-xs text-white/35">台北時區 · 今日累計</p>
              </div>
              <Eye className="h-8 w-8 shrink-0 text-white/15" strokeWidth={1.25} />
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-wide text-white/45">總瀏覽次數</p>
                <p className="mt-2 font-display text-4xl text-white">
                  {loading && !stats ? '—' : formatCount(stats?.totalCount ?? 0)}
                </p>
                <p className="mt-1 text-xs text-white/35">自啟用統計以來</p>
              </div>
              <Eye className="h-8 w-8 shrink-0 text-white/15" strokeWidth={1.25} />
            </div>
          </GlassPanel>
        </div>
      )}
    </section>
  )
}
