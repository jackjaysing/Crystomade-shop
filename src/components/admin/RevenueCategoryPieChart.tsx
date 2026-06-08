import {
  REVENUE_CATEGORY_COLORS,
  formatRevenueAmount,
  type RevenueCategorySlice,
} from '../../lib/revenueStats'

interface RevenueCategoryPieChartProps {
  slices: RevenueCategorySlice[]
}

const SIZE = 200
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = 78
const INNER_RADIUS = 46

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number
) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  }
}

function describeDonutSlice(
  startAngle: number,
  endAngle: number,
  outerR: number,
  innerR: number
): string {
  const startOuter = polarToCartesian(CX, CY, outerR, endAngle)
  const endOuter = polarToCartesian(CX, CY, outerR, startAngle)
  const startInner = polarToCartesian(CX, CY, innerR, startAngle)
  const endInner = polarToCartesian(CX, CY, innerR, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

/** 品類收入比例圓餅圖（純 SVG 環形圖） */
export function RevenueCategoryPieChart({ slices }: RevenueCategoryPieChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.revenue, 0)

  if (total <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-sm text-white/40">
        <div
          className="flex h-40 w-40 items-center justify-center rounded-full border border-dashed border-white/15"
          aria-hidden
        >
          尚無品類收入
        </div>
        <p className="mt-3">已結帳訂單尚無可歸類品項</p>
      </div>
    )
  }

  let cursor = 0
  const segments = slices.map((slice) => {
    const sweep = (slice.revenue / total) * 360
    const start = cursor
    const end = cursor + sweep
    cursor = end
    return { slice, start, end: Math.min(end, 359.999) }
  })

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
      <div className="flex flex-col items-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-48 w-48 shrink-0"
          role="img"
          aria-label="手串、配飾、擺件、礦石收入比例圓餅圖"
        >
          {segments.map(({ slice, start, end }) => (
            <path
              key={slice.category}
              d={describeDonutSlice(start, end, RADIUS, INNER_RADIUS)}
              fill={REVENUE_CATEGORY_COLORS[slice.category]}
              opacity={0.92}
            >
              <title>
                {slice.label}：{formatRevenueAmount(slice.revenue)}（{slice.percent}%）
              </title>
            </path>
          ))}
          <circle cx={CX} cy={CY} r={INNER_RADIUS - 2} className="fill-void/90" />
        </svg>
        <p className="mt-3 text-center text-lg font-medium tabular-nums tracking-wide text-amber-glow">
          總計 {formatRevenueAmount(total)}
        </p>
      </div>

      <ul className="w-full max-w-xs space-y-3 sm:pt-4">
        {slices.map((slice) => (
          <li key={slice.category} className="flex items-center gap-3 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: REVENUE_CATEGORY_COLORS[slice.category] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-white/75">{slice.label}</span>
            <span className="shrink-0 text-white/50">{slice.percent}%</span>
            <span className="shrink-0 text-amber-glow/90">
              {formatRevenueAmount(slice.revenue)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
