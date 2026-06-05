import { useMemo } from 'react'
import {
  BROWSE_WEEKDAY_LABELS,
  BROWSE_WEEKDAY_ORDER,
  type BrowseHeatmapCell,
} from '../../lib/browseAnalytics'

interface BrowseTimeHeatmapProps {
  cells: BrowseHeatmapCell[]
}

const CELL = 18
const GAP = 2
const LEFT_PAD = 42
const TOP_PAD = 24
const BOTTOM_PAD = 28

function heatColor(intensity: number): string {
  if (intensity <= 0) return 'rgba(255,255,255,0.04)'
  const alpha = 0.18 + intensity * 0.82
  return `rgba(212, 165, 116, ${alpha.toFixed(3)})`
}

/** 瀏覽時段熱力圖（週幾 × 小時） */
export function BrowseTimeHeatmap({ cells }: BrowseTimeHeatmapProps) {
  const { matrix, maxCount, totalCount } = useMemo(() => {
    const map = new Map<string, number>()
    for (const cell of cells) {
      map.set(`${cell.dayOfWeek}-${cell.hour}`, cell.count)
    }
    let max = 0
    let total = 0
    const rows = BROWSE_WEEKDAY_ORDER.map((day) =>
      Array.from({ length: 24 }, (_, hour) => {
        const count = map.get(`${day}-${hour}`) ?? 0
        max = Math.max(max, count)
        total += count
        return count
      })
    )
    return { matrix: rows, maxCount: max, totalCount: total }
  }, [cells])

  const width = LEFT_PAD + 24 * (CELL + GAP)
  const height = TOP_PAD + 7 * (CELL + GAP) + BOTTOM_PAD

  if (totalCount <= 0) {
    return (
      <p className="text-sm text-white/40">
        尚無時段瀏覽紀錄（訪客瀏覽前台頁面後會開始累計）
      </p>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[360px] w-full max-w-3xl"
        role="img"
        aria-label="瀏覽時段熱力圖：星期幾與小時"
      >
        {[0, 6, 12, 18, 23].map((hour) => (
          <text
            key={hour}
            x={LEFT_PAD + hour * (CELL + GAP) + CELL / 2}
            y={14}
            textAnchor="middle"
            className="fill-white/40 text-[9px]"
          >
            {hour}時
          </text>
        ))}

        {matrix.map((row, rowIndex) => {
          const day = BROWSE_WEEKDAY_ORDER[rowIndex]
          const y = TOP_PAD + rowIndex * (CELL + GAP)

          return (
            <g key={day}>
              <text
                x={0}
                y={y + CELL / 2 + 4}
                className="fill-white/55 text-[10px]"
              >
                {BROWSE_WEEKDAY_LABELS[day]}
              </text>
              {row.map((count, hour) => {
                const intensity = maxCount > 0 ? count / maxCount : 0
                const x = LEFT_PAD + hour * (CELL + GAP)
                return (
                  <rect
                    key={`${day}-${hour}`}
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    fill={heatColor(intensity)}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.5}
                  >
                    <title>
                      {BROWSE_WEEKDAY_LABELS[day]} {hour}:00–{hour}:59 ·{' '}
                      {count.toLocaleString('zh-TW')} 次
                    </title>
                  </rect>
                )
              })}
            </g>
          )
        })}

        <text
          x={LEFT_PAD}
          y={height - 6}
          className="fill-white/35 text-[9px]"
        >
          橫軸：小時（台北時區）· 顏色越深代表瀏覽次數越多
        </text>
      </svg>
    </div>
  )
}
