import { useId } from 'react'
import { Flame } from 'lucide-react'

type HotProductBadgeVariant = 'overlay' | 'inline'

interface HotProductBadgeProps {
  className?: string
  /** overlay：商品圖右上角（較大、有光暈）；inline：列表內嵌 */
  variant?: HotProductBadgeVariant
}

/** 前台／後台共用的熱門商品角標 */
export function HotProductBadge({
  className = '',
  variant = 'overlay',
}: HotProductBadgeProps) {
  const gradientId = useId().replace(/:/g, '')
  const isOverlay = variant === 'overlay'

  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-full border backdrop-blur-md ${
        isOverlay
          ? 'gap-1.5 border-amber-glow/55 bg-gradient-to-r from-void/95 via-graphite/95 to-void/95 px-3 py-1.5 animate-flameGlow'
          : 'gap-1 border-orange-400/45 bg-void/85 px-2 py-0.5 shadow-[0_0_14px_rgba(251,146,60,0.3)]'
      } ${className}`}
    >
      <span
        className={`relative flex shrink-0 items-center justify-center ${
          isOverlay ? 'h-5 w-5' : 'h-4 w-4'
        }`}
      >
        <Flame
          aria-hidden
          className={`absolute text-orange-500/40 ${
            isOverlay ? 'h-5 w-5' : 'h-4 w-4'
          } animate-flameFlicker`}
          strokeWidth={1.5}
        />
        <Flame
          aria-hidden
          className={`relative text-amber-glow drop-shadow-[0_0_10px_rgba(251,146,60,0.95)] ${
            isOverlay ? 'h-[18px] w-[18px]' : 'h-3.5 w-3.5'
          }`}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
        />
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="55%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
          </defs>
        </svg>
      </span>

      <span
        className={`whitespace-nowrap font-display font-semibold tracking-[0.18em] text-amber-glow drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
          isOverlay ? 'text-xs' : 'text-[10px]'
        }`}
      >
        熱門
      </span>
    </span>
  )
}
