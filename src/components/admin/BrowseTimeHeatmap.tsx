import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BROWSE_WEEKDAY_LABELS,
  BROWSE_WEEKDAY_ORDER,
  type BrowseHeatmapCell,
} from '../../lib/browseAnalytics'

interface BrowseTimeHeatmapProps {
  cells: BrowseHeatmapCell[]
}

const GAP = 3
const LEFT_PAD = 44
const TOP_PAD = 28
const BOTTOM_PAD = 32
const MOBILE_CELL = 22
const MIN_DESKTOP_CELL = 26
const MAX_DESKTOP_CELL = 38

function heatColor(intensity: number): string {
  if (intensity <= 0) return 'rgba(255,255,255,0.04)'
  const alpha = 0.18 + intensity * 0.82
  return `rgba(212, 165, 116, ${alpha.toFixed(3)})`
}

/** 瀏覽時段熱力圖（週幾 × 小時） */
export function BrowseTimeHeatmap({ cells }: BrowseTimeHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)

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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const media = window.matchMedia('(min-width: 768px)')

    const update = () => {
      setIsDesktop(media.matches)
      setContainerWidth(el.clientWidth)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    media.addEventListener('change', update)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', update)
    }
  }, [])

  const cellSize = useMemo(() => {
    if (!isDesktop || containerWidth <= 0) return MOBILE_CELL
    const available = containerWidth - LEFT_PAD - 24 * GAP
    return Math.min(
      MAX_DESKTOP_CELL,
      Math.max(MIN_DESKTOP_CELL, Math.floor(available / 24))
    )
  }, [containerWidth, isDesktop])

  const width = LEFT_PAD + 24 * (cellSize + GAP)
  const height = TOP_PAD + 7 * (cellSize + GAP) + BOTTOM_PAD

  if (totalCount <= 0) {
    return (
      <p className="text-sm text-white/40">
        尚無時段瀏覽紀錄（訪客瀏覽前台頁面後會開始累計）
      </p>
    )
  }

  return (
    <div
      ref={containerRef}
      className="-mx-1 w-full overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-w-none max-md:w-max"
        style={isDesktop ? undefined : { minWidth: `${width}px` }}
        role="img"
        aria-label="瀏覽時段熱力圖：星期幾與小時"
      >
        {[0, 6, 12, 18, 23].map((hour) => (
          <text
            key={hour}
            x={LEFT_PAD + hour * (cellSize + GAP) + cellSize / 2}
            y={isDesktop ? 18 : 16}
            textAnchor="middle"
            className={`fill-white/40 ${isDesktop ? 'text-[11px]' : 'text-[10px] sm:text-[9px]'}`}
          >
            {hour}時
          </text>
        ))}

        {matrix.map((row, rowIndex) => {
          const day = BROWSE_WEEKDAY_ORDER[rowIndex]
          const y = TOP_PAD + rowIndex * (cellSize + GAP)

          return (
            <g key={day}>
              <text
                x={0}
                y={y + cellSize / 2 + 4}
                className={`fill-white/55 ${isDesktop ? 'text-xs' : 'text-[11px] sm:text-[10px]'}`}
              >
                {BROWSE_WEEKDAY_LABELS[day]}
              </text>
              {row.map((count, hour) => {
                const intensity = maxCount > 0 ? count / maxCount : 0
                const x = LEFT_PAD + hour * (cellSize + GAP)
                return (
                  <rect
                    key={`${day}-${hour}`}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx={isDesktop ? 5 : 4}
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
          y={height - 8}
          className={`fill-white/35 ${isDesktop ? 'text-[11px]' : 'text-[10px] sm:text-[9px]'}`}
        >
          橫軸：小時（台北時區）· 顏色越深代表瀏覽次數越多
        </text>
      </svg>
    </div>
  )
}
