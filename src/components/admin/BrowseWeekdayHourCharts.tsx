import type { BrowseHeatmapCell } from '../../lib/browseAnalytics'
import {
  summarizeViewsByHour,
  summarizeViewsByWeekday,
} from '../../lib/browseAnalytics'

interface BrowseWeekdayHourChartsProps {
  cells: BrowseHeatmapCell[]
}

const CHART_HEIGHT = 120

function MiniBarChart({
  items,
  ariaLabel,
}: {
  items: { label: string; count: number }[]
  ariaLabel: string
}) {
  const max = Math.max(...items.map((item) => item.count), 1)
  const barWidth = 28
  const gap = 8
  const width = items.length * (barWidth + gap) + gap

  return (
    <svg
      viewBox={`0 0 ${width} ${CHART_HEIGHT + 36}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const barHeight =
          item.count > 0 ? Math.max(6, (item.count / max) * CHART_HEIGHT) : 2
        const x = gap + index * (barWidth + gap)
        const y = CHART_HEIGHT - barHeight
        return (
          <g key={item.label}>
            <title>
              {item.label}：{item.count.toLocaleString('zh-TW')} 次
            </title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill="url(#browseMiniBar)"
            />
            <text
              x={x + barWidth / 2}
              y={CHART_HEIGHT + 16}
              textAnchor="middle"
              className="fill-white/45 text-[8px]"
            >
              {item.label.slice(1)}
            </text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="browseMiniBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d78e" />
          <stop offset="100%" stopColor="#c9a227" stopOpacity="0.25" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function HourBarChart({
  items,
  ariaLabel,
}: {
  items: { label: string; count: number }[]
  ariaLabel: string
}) {
  const sampled = items.filter((_, hour) => hour % 2 === 0)
  const max = Math.max(...sampled.map((item) => item.count), 1)
  const barWidth = 14
  const gap = 4
  const width = sampled.length * (barWidth + gap) + gap

  return (
    <svg
      viewBox={`0 0 ${width} ${CHART_HEIGHT + 36}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {sampled.map((item, index) => {
        const barHeight =
          item.count > 0 ? Math.max(6, (item.count / max) * CHART_HEIGHT) : 2
        const x = gap + index * (barWidth + gap)
        const y = CHART_HEIGHT - barHeight
        const hour = index * 2
        return (
          <g key={hour}>
            <title>
              {hour}時：{item.count.toLocaleString('zh-TW')} 次
            </title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill="url(#browseHourBar)"
            />
            <text
              x={x + barWidth / 2}
              y={CHART_HEIGHT + 16}
              textAnchor="middle"
              className="fill-white/45 text-[7px]"
            >
              {hour}
            </text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="browseHourBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** 依星期與小時彙總的輔助長條圖 */
export function BrowseWeekdayHourCharts({ cells }: BrowseWeekdayHourChartsProps) {
  const weekdayRows = summarizeViewsByWeekday(cells)
  const hourRows = summarizeViewsByHour(cells)
  const hasData = weekdayRows.some((row) => row.count > 0)

  if (!hasData) return null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs text-white/45">各星期瀏覽量</p>
        <MiniBarChart items={weekdayRows} ariaLabel="各星期瀏覽次數長條圖" />
      </div>
      <div>
        <p className="mb-2 text-xs text-white/45">各時段瀏覽量（每 2 小時）</p>
        <HourBarChart items={hourRows} ariaLabel="各小時瀏覽次數長條圖" />
      </div>
    </div>
  )
}
