import {
  formatDiscountZheLabel,
  getProductSalePrice,
  hasProductDiscount,
} from '../../lib/productPricing'
import type { Product } from '../../lib/types'

interface ProductPriceDisplayProps {
  product: Pick<Product, 'price' | 'discount_zhe'>
  /** 卡片較小、詳情較大 */
  variant?: 'card' | 'detail'
}

/** 前台商品價格（原價／特價） */
export function ProductPriceDisplay({
  product,
  variant = 'card',
}: ProductPriceDisplayProps) {
  const salePrice = getProductSalePrice(product)
  const onSale = hasProductDiscount(product)

  if (!onSale) {
    return (
      <p
        className={
          variant === 'detail'
            ? 'text-xl text-amber-glow'
            : 'text-sm text-amber-glow'
        }
      >
        NT$ {product.price.toLocaleString()}
      </p>
    )
  }

  const discountLabel =
    product.discount_zhe != null
      ? formatDiscountZheLabel(product.discount_zhe)
      : null

  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p
          className={
            variant === 'detail'
              ? 'text-xl font-medium text-amber-glow'
              : 'text-sm font-medium text-amber-glow'
          }
        >
          特價 NT$ {salePrice.toLocaleString()}
        </p>
        {discountLabel && variant === 'detail' && (
          <span className="rounded-full border border-amber-glow/40 bg-amber-glow/10 px-2 py-0.5 text-[10px] tracking-wider text-amber-glow/90">
            {discountLabel}
          </span>
        )}
      </div>
      <p
        className={
          variant === 'detail'
            ? 'text-sm text-white/45 line-through'
            : 'text-xs text-white/40 line-through'
        }
      >
        原價 NT$ {product.price.toLocaleString()}
      </p>
    </div>
  )
}
