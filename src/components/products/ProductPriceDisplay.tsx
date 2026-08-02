import {
  formatDiscountZheLabel,
  formatPriceRangeLabel,
  getProductPriceRange,
  getProductSalePrice,
  getVariantSalePrice,
  hasProductDiscount,
  productHasVariants,
} from '../../lib/productPricing'
import type { Product, ProductVariant } from '../../lib/types'

interface ProductPriceDisplayProps {
  product: Pick<Product, 'price' | 'discount_zhe'> & {
    variants?: Product['variants']
  }
  /** 已選規格時詳情頁顯示該規格價 */
  selectedVariant?: Pick<ProductVariant, 'price'> | null
  /** 卡片較小、詳情較大 */
  variant?: 'card' | 'detail'
}

/** 前台商品價格（折扣時僅顯示金額，不顯示特價文案） */
export function ProductPriceDisplay({
  product,
  selectedVariant = null,
  variant = 'card',
}: ProductPriceDisplayProps) {
  const range = getProductPriceRange(product)
  const onSale = hasProductDiscount(product)
  const showSelected =
    selectedVariant != null && productHasVariants(product)

  const salePrice = showSelected
    ? getVariantSalePrice(selectedVariant, product.discount_zhe)
    : getProductSalePrice(product)
  const originalPrice = showSelected
    ? selectedVariant.price
    : range.minOriginal === range.maxOriginal
      ? range.minOriginal
      : null
  const saleLabel = showSelected
    ? `NT$ ${salePrice.toLocaleString()}`
    : formatPriceRangeLabel(range.min, range.max)
  const originalLabel =
    originalPrice != null
      ? `NT$ ${originalPrice.toLocaleString()}`
      : range.minOriginal !== range.maxOriginal
        ? formatPriceRangeLabel(range.minOriginal, range.maxOriginal)
        : `NT$ ${range.minOriginal.toLocaleString()}`

  if (!onSale) {
    return (
      <p
        className={
          variant === 'detail'
            ? 'text-xl text-amber-glow'
            : 'text-sm text-amber-glow'
        }
      >
        {saleLabel}
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
          {saleLabel}
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
        {originalLabel}
      </p>
    </div>
  )
}
