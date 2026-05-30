import type { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
}

/** 毛玻璃面板（Glassmorphism） */
export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-glass ${className}`}
    >
      {children}
    </div>
  )
}
