import type { RevenueMonthPoint } from '../../lib/revenueStats'
import { formatRevenueAmount } from '../../lib/revenueStats'

interface RevenueBarChartProps {
  data: RevenueMonthPoint[]
}

const CHART_HEIGHT = 200
const BAR_GAP = 12

/** 近月已結帳收入長條圖（純 SVG） */
export function RevenueBarChart({ data }: RevenueBarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-white/40">尚無資料</p>
  }

  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1)

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${data.length * 72} ${CHART_HEIGHT + 48}`}
        className="h-auto w-full max-h-[280px]"
        role="img"
        aria-label="近六個月已結帳收入長條圖"
      >
        {data.map((point, index) => {
          const barHeight =
            point.revenue > 0
              ? Math.max(8, (point.revenue / maxRevenue) * CHART_HEIGHT)
              : 4
          const x = index * 72 + BAR_GAP
          const y = CHART_HEIGHT - barHeight

          return (
            <g key={point.monthKey}>
              <title>
                {point.label}：{formatRevenueAmount(point.revenue)}（{point.orderCount}{' '}
                筆已結帳）
              </title>
              <rect
                x={x}
                y={y}
                width={72 - BAR_GAP * 2}
                height={barHeight}
                rx={6}
                fill="url(#revenueBarGlow)"
              />
              <text
                x={x + (72 - BAR_GAP * 2) / 2}
                y={CHART_HEIGHT + 18}
                textAnchor="middle"
                className="fill-white/50 text-[10px]"
              >
                {Number(point.monthKey.split('-')[1])}月
              </text>
              {point.revenue > 0 && (
                <text
                  x={x + (72 - BAR_GAP * 2) / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-amber-glow/90 text-[9px]"
                >
                  {(point.revenue / 1000).toFixed(point.revenue >= 10000 ? 0 : 1)}k
                </text>
              )}
            </g>
          )
        })}
        <defs>
          <linearGradient id="revenueBarGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d78e" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
