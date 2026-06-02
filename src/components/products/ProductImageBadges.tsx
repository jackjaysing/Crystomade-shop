import { hasProductDiscount } from '../../lib/productPricing'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { HotProductBadge } from './HotProductBadge'
import { SaleProductBadge } from './SaleProductBadge'

interface ProductImageBadgesProps {
  product: Product
  className?: string
}

/** 商品圖右上角：熱門在上、特價在下（同等尺寸） */
export function ProductImageBadges({ product, className = '' }: ProductImageBadgesProps) {
  const isSold = isProductSoldOut(product)
  const showHot = product.is_hot
  const showSale = !isSold && hasProductDiscount(product)

  if (!showHot && !showSale) return null

  return (
    <div
      className={`pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5 ${className}`}
    >
      {showHot && <HotProductBadge className="backdrop-blur-sm" />}
      {showSale && <SaleProductBadge product={product} className="backdrop-blur-sm" />}
    </div>
  )
}
