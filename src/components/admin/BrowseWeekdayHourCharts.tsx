import type { BrowseHeatmapCell } from '../../lib/browseAnalytics'
import {
  summarizeViewsByHour,
  summarizeViewsByWeekday,
} from '../../lib/browseAnalytics'

interface BrowseWeekdayHourChartsProps {
  cells: BrowseHeatmapCell[]
}

interface BarChartProps {
  items: { label: string; count: number }[]
  ariaLabel: string
}

function ResponsiveBarChart({ items, ariaLabel }: BarChartProps) {
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <div
      className="flex w-full gap-2 md:gap-3"
      role="img"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const heightPercent = item.count > 0 ? Math.max(6, (item.count / max) * 100) : 2
        return (
          <div
            key={item.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            title={`${item.label}：${item.count.toLocaleString('zh-TW')} 次`}
          >
            <div className="flex h-40 w-full items-end md:h-52">
              <div
                className="w-full rounded-md bg-gradient-to-t from-amber-glow/25 to-amber-glow"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-white/45 md:text-xs">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function HourBarChart({ items, ariaLabel }: BarChartProps) {
  const sampled = items.filter((_, hour) => hour % 2 === 0)
  const max = Math.max(...sampled.map((item) => item.count), 1)

  return (
    <div
      className="flex w-full gap-1.5 md:gap-2"
      role="img"
      aria-label={ariaLabel}
    >
      {sampled.map((item, index) => {
        const heightPercent = item.count > 0 ? Math.max(6, (item.count / max) * 100) : 2
        const hour = index * 2
        return (
          <div
            key={hour}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            title={`${hour}時：${item.count.toLocaleString('zh-TW')} 次`}
          >
            <div className="flex h-40 w-full items-end md:h-52">
              <div
                className="w-full rounded-md bg-gradient-to-t from-blue-500/20 to-blue-300"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-white/45 md:text-xs">{hour}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 依星期與小時彙總的輔助長條圖 */
export function BrowseWeekdayHourCharts({ cells }: BrowseWeekdayHourChartsProps) {
  const weekdayRows = summarizeViewsByWeekday(cells)
  const hourRows = summarizeViewsByHour(cells)
  const hasData = weekdayRows.some((row) => row.count > 0)

  if (!hasData) return null

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="w-full">
        <p className="mb-3 text-sm text-white/45 md:text-base">各星期瀏覽量</p>
        <ResponsiveBarChart items={weekdayRows} ariaLabel="各星期瀏覽次數長條圖" />
      </div>
      <div className="w-full">
        <p className="mb-3 text-sm text-white/45 md:text-base">各時段瀏覽量（每 2 小時）</p>
        <HourBarChart items={hourRows} ariaLabel="各小時瀏覽次數長條圖" />
      </div>
    </div>
  )
}
