import type { ReactNode } from 'react'

interface HotProductFrameProps {
  children: ReactNode
  /** 詳情彈窗頂部：僅上圓角 */
  topOnly?: boolean
  className?: string
}

/** 熱門商品：金屬漸層外框（列表卡片／詳情頂部共用） */
export function HotProductFrame({
  children,
  topOnly = false,
  className = '',
}: HotProductFrameProps) {
  const radius = topOnly ? 'rounded-t-2xl' : 'rounded-[14px]'
  const innerRadius = topOnly ? 'rounded-t-[14px]' : 'rounded-[12px]'

  return (
    <div
      className={`relative bg-gradient-to-br from-amber-glow/90 via-orange-400/55 to-amber-deep/75 p-[2px] shadow-[0_0_28px_rgba(212,165,116,0.22)] ${radius} ${className}`}
    >
      <div
        className={`pointer-events-none absolute inset-[2px] border border-white/10 ${innerRadius}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12)_0%,_transparent_55%)] ${radius}`}
        aria-hidden
      />
      {children}
    </div>
  )
}
