import { BadgePercent } from 'lucide-react'
import { hasProductDiscount } from '../../lib/productPricing'
import type { Product } from '../../lib/types'

type SaleProductBadgeVariant = 'overlay' | 'inline'

interface SaleProductBadgeProps {
  product: Pick<Product, 'price' | 'discount_zhe'>
  className?: string
  variant?: SaleProductBadgeVariant
}

/** 前台／後台：折扣商品特價角標（尺寸對齊熱門角標） */
export function SaleProductBadge({
  product,
  className = '',
  variant = 'overlay',
}: SaleProductBadgeProps) {
  if (!hasProductDiscount(product)) return null

  const isOverlay = variant === 'overlay'

  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-full border backdrop-blur-md ${
        isOverlay
          ? 'gap-1.5 border-rose-400/55 bg-gradient-to-r from-void/95 via-rose-950/50 to-void/95 px-3 py-1.5 shadow-[0_0_18px_rgba(244,63,94,0.25)]'
          : 'gap-1 border-rose-400/45 bg-void/85 px-2 py-0.5'
      } ${className}`}
    >
      <span
        className={`relative flex shrink-0 items-center justify-center ${
          isOverlay ? 'h-5 w-5' : 'h-4 w-4'
        }`}
      >
        <BadgePercent
          aria-hidden
          className={`text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,0.6)] ${
            isOverlay ? 'h-[18px] w-[18px]' : 'h-3.5 w-3.5'
          }`}
          strokeWidth={2}
        />
      </span>
      <span
        className={`whitespace-nowrap font-display font-semibold tracking-[0.18em] text-rose-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
          isOverlay ? 'text-xs' : 'text-[10px]'
        }`}
      >
        特價
      </span>
    </span>
  )
}
