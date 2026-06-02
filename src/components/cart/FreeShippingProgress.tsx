import { Sparkles, Truck } from 'lucide-react'
import { FREE_SHIPPING_THRESHOLD } from '../../constants/shipping'
import {
  getAmountToFreeShipping,
  getFreeShippingProgressPercent,
  hasFreeShipping,
} from '../../lib/cartShipping'

interface FreeShippingProgressProps {
  subtotal: number
  className?: string
  /** 未達免運時：前往前台繼續選購 */
  onShopMore?: () => void
}

/** 購物車湊免運進度條 */
export function FreeShippingProgress({
  subtotal,
  className = '',
  onShopMore,
}: FreeShippingProgressProps) {
  const progress = getFreeShippingProgressPercent(subtotal)
  const qualified = hasFreeShipping(subtotal)
  const remaining = getAmountToFreeShipping(subtotal)

  return (
    <div
      className={`rounded-xl border border-amber-glow/20 bg-gradient-to-br from-amber-glow/[0.08] via-white/[0.03] to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full border ${
              qualified
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-glow/35 bg-amber-glow/10 text-amber-glow'
            }`}
          >
            {qualified ? (
              <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            ) : (
              <Truck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            )}
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-white/85">
              {qualified ? '已達免運門檻' : '湊免運進度'}
            </p>
            <p className="mt-0.5 text-[11px] text-white/45">
              滿 NT$ {FREE_SHIPPING_THRESHOLD.toLocaleString()} 免運
            </p>
          </div>
        </div>
        <p
          className={`shrink-0 text-right text-sm font-medium tabular-nums ${
            qualified ? 'text-emerald-300' : 'text-amber-glow'
          }`}
        >
          {Math.round(progress)}%
        </p>
      </div>

      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-void/80 ring-1 ring-inset ring-white/10"
        aria-hidden
      >
        <div
          className={`relative h-full rounded-full transition-[width] duration-500 ease-out ${
            qualified
              ? 'bg-gradient-to-r from-emerald-500/90 via-emerald-400 to-emerald-300/90'
              : 'bg-gradient-to-r from-amber-deep via-amber-glow to-amber-200/90'
          }`}
          style={{ width: `${progress}%` }}
        >
          <span
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)]"
            aria-hidden
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] tabular-nums">
        <span className="text-white/40">
          NT$ {Math.min(subtotal, FREE_SHIPPING_THRESHOLD).toLocaleString()}
        </span>
        <span className="text-white/35">
          NT$ {FREE_SHIPPING_THRESHOLD.toLocaleString()}
        </span>
      </div>

      <p className="mt-2 text-center text-xs leading-relaxed text-white/55">
        {qualified ? (
          <span className="text-emerald-300/90">恭喜！此筆訂單享免運優惠</span>
        ) : (
          <>
            再消費{' '}
            <span className="font-medium text-amber-glow">
              NT$ {remaining.toLocaleString()}
            </span>{' '}
            即可免運
          </>
        )}
      </p>

      {!qualified && onShopMore && (
        <button
          type="button"
          onClick={onShopMore}
          className="mt-3 w-full rounded-lg border border-amber-glow/45 bg-amber-glow/15 py-2.5 text-sm tracking-wide text-amber-glow transition hover:border-amber-glow/70 hover:bg-amber-glow/25"
        >
          去湊單
        </button>
      )}
    </div>
  )
}
