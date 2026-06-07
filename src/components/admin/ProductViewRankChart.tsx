import type { ProductViewRankRow } from '../../lib/browseAnalytics'
import { adminProductThumbAlt } from '../../lib/imageAlt'

interface ProductViewRankChartProps {
  rows: ProductViewRankRow[]
  metricLabel: string
}

/** 商品瀏覽次數排行（縮圖 + 完整名稱 + 長條圖） */
export function ProductViewRankChart({ rows, metricLabel }: ProductViewRankChartProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-white/40">
        尚無商品瀏覽紀錄（會員開啟商品詳情後會開始累計）
      </p>
    )
  }

  const maxCount = Math.max(...rows.map((row) => row.count), 1)

  return (
    <ol className="space-y-4" aria-label={`商品瀏覽次數排行（${metricLabel}）`}>
      {rows.map((row, index) => {
        const barPercent = Math.max(2, (row.count / maxCount) * 100)

        return (
          <li
            key={row.productId}
            className="rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:p-4 md:p-5"
          >
            <div className="flex gap-3 sm:gap-4">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs text-white/40 sm:mt-4"
                aria-hidden
              >
                {index + 1}
              </span>

              {row.imageUrl ? (
                <img
                  src={row.imageUrl}
                  alt={adminProductThumbAlt(row.name)}
                  className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover sm:h-16 sm:w-16 md:h-20 md:w-20"
                />
              ) : (
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] text-[10px] text-white/30 sm:h-16 sm:w-16 md:h-20 md:w-20"
                  aria-hidden
                >
                  無圖
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug break-words text-white md:text-lg">
                  {row.name}
                </p>
                <div className="mt-2 flex items-center gap-3 md:mt-3">
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8 md:h-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-glow/35 to-amber-glow"
                      style={{ width: `${barPercent}%` }}
                      role="presentation"
                    />
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-amber-glow md:text-base">
                    {row.count.toLocaleString('zh-TW')}
                    <span className="ml-1 text-xs text-white/40">次</span>
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-white/35">{metricLabel}瀏覽</p>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
