import type { ReactNode } from 'react'

interface HotProductFrameProps {
  children: ReactNode
  /** 詳情彈窗頂部：僅上圓角 */
  topOnly?: boolean
  className?: string
}

/** 熱門商品：金屬漸層外框 + 繞框旋轉光暈 */
export function HotProductFrame({
  children,
  topOnly = false,
  className = '',
}: HotProductFrameProps) {
  const radius = topOnly ? 'rounded-t-2xl' : 'rounded-[14px]'
  const innerRadius = topOnly ? 'rounded-t-[14px]' : 'rounded-[12px]'
  const innerClass = topOnly
    ? `relative overflow-hidden bg-graphite ${innerRadius}`
    : `relative h-full overflow-hidden ${innerRadius}`

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden p-[2px] shadow-[0_0_28px_rgba(212,165,116,0.22)] ${radius} ${className}`}
    >
      {/* 繞圈旋轉的琥珀光帶（僅露出邊框一圈） */}
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${radius}`}
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 motion-safe:animate-hotOrbit"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(184,134,74,0.15) 0deg, rgba(212,165,116,0.08) 40deg, transparent 70deg, transparent 250deg, rgba(212,165,116,0.35) 295deg, rgba(255,230,190,0.95) 318deg, rgba(212,165,116,0.45) 342deg, rgba(184,134,74,0.15) 360deg)',
          }}
        />
      </div>

      {/* 靜態金屬底色，讓旋轉光帶更有層次 */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-glow/55 via-orange-400/25 to-amber-deep/45 ${radius}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12)_0%,_transparent_55%)] ${radius}`}
        aria-hidden
      />

      <div
        className={`pointer-events-none absolute inset-[2px] border border-white/10 ${innerRadius}`}
        aria-hidden
      />
      <div className={`relative z-[1] ${innerClass}`}>{children}</div>
    </div>
  )
}
