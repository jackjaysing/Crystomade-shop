import { Link } from 'react-router-dom'
import {
  getPointRedeemButtonLabel,
  type PointRedeemButtonState,
} from '../../hooks/usePointRedeemState'
import { pointProductPhotoAlt } from '../../lib/imageAlt'
import type { PointProduct } from '../../lib/types'

interface PointProductCardProps {
  product: PointProduct
  buttonState: PointRedeemButtonState
  onRedeem: () => void
  variant?: 'compact' | 'grid'
}

/** 點數商城商品卡片 */
export function PointProductCard({
  product,
  buttonState,
  onRedeem,
  variant = 'grid',
}: PointProductCardProps) {
  const disabled =
    buttonState === 'in_cart' ||
    buttonState === 'insufficient' ||
    buttonState === 'sold_out'

  const isCompact = variant === 'compact'

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.04] to-transparent ${
        isCompact
          ? 'w-36 shrink-0 border-white/10 sm:w-40'
          : 'border-amber-glow/20 shadow-[0_0_24px_rgba(212,165,116,0.08)]'
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-void/50">
        <img
          src={product.image_url}
          alt={pointProductPhotoAlt(product.name)}
          className="h-full w-full object-cover transition duration-500 hover:scale-105"
          loading="lazy"
        />
        {product.stock <= 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-void/70 text-xs tracking-widest text-white/70">
            已售罄
          </span>
        )}
      </div>

      <div className={isCompact ? 'space-y-2 p-2.5' : 'space-y-3 p-4 sm:p-5'}>
        <h3
          className={`leading-snug text-white/90 ${
            isCompact
              ? 'line-clamp-2 min-h-[2.25rem] text-[11px]'
              : 'font-display text-lg sm:min-h-[3.25rem]'
          }`}
        >
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`font-medium text-amber-glow ${
              isCompact ? 'text-xs' : 'text-base'
            }`}
          >
            {product.required_points} 點
          </p>
          {!isCompact && (
            <p className="text-xs text-white/40">庫存 {product.stock}</p>
          )}
        </div>

        {buttonState === 'guest' ? (
          <Link
            to="/account"
            state={{ from: '/point-shop' }}
            className={`block w-full rounded-lg border border-amber-glow/40 bg-amber-glow/15 text-center tracking-wide text-amber-glow transition hover:bg-amber-glow/25 ${
              isCompact ? 'py-1.5 text-[11px]' : 'py-3 text-sm'
            }`}
          >
            {getPointRedeemButtonLabel('guest')}
          </Link>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={onRedeem}
            className={`w-full rounded-lg border tracking-wide transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30 border-amber-glow/40 bg-amber-glow/15 text-amber-glow hover:bg-amber-glow/25 ${
              isCompact ? 'py-1.5 text-[11px]' : 'py-3 text-sm'
            }`}
          >
            {getPointRedeemButtonLabel(buttonState)}
          </button>
        )}
      </div>
    </article>
  )
}
