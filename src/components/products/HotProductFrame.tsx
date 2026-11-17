import { useId, type ReactNode } from 'react'

interface HotProductFrameProps {
  children: ReactNode
  /** 詳情彈窗頂部：僅上圓角 */
  topOnly?: boolean
  className?: string
}

/** 熱門商品：金屬外框 + 光點沿邊框繞圈 */
export function HotProductFrame({
  children,
  topOnly = false,
  className = '',
}: HotProductFrameProps) {
  const reactId = useId().replace(/:/g, '')
  const glowId = `hot-orbit-glow-${reactId}`
  const radius = topOnly ? 'rounded-t-2xl' : 'rounded-[14px]'
  const innerRadius = topOnly ? 'rounded-t-[14px]' : 'rounded-[12px]'
  const innerClass = topOnly
    ? `relative overflow-hidden bg-graphite ${innerRadius}`
    : `relative h-full overflow-hidden ${innerRadius}`
  const rx = topOnly ? 5 : 3.5

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-amber-glow/90 via-orange-400/55 to-amber-deep/75 p-[2px] shadow-[0_0_28px_rgba(212,165,116,0.22)] ${radius} ${className}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12)_0%,_transparent_55%)] ${radius}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-[2px] border border-white/10 ${innerRadius}`}
        aria-hidden
      />

      {/* 光點沿外框繞圈（comet） */}
      <svg
        className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <filter
            id={glowId}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="0.7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* 拖尾 */}
        <rect
          x="1.4"
          y="1.4"
          width="97.2"
          height="97.2"
          rx={rx}
          ry={rx}
          pathLength={100}
          fill="none"
          stroke="rgba(212,165,116,0.5)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray="14 86"
          filter={`url(#${glowId})`}
          vectorEffect="nonScalingStroke"
          className="hot-orbit-dash hot-orbit-dash--trail"
        />
        {/* 亮點頭 */}
        <rect
          x="1.4"
          y="1.4"
          width="97.2"
          height="97.2"
          rx={rx}
          ry={rx}
          pathLength={100}
          fill="none"
          stroke="rgba(255,240,210,1)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeDasharray="5 95"
          filter={`url(#${glowId})`}
          vectorEffect="nonScalingStroke"
          className="hot-orbit-dash"
        />
      </svg>

      <div className={`relative z-[1] ${innerClass}`}>{children}</div>
    </div>
  )
}
