import { hasProductDiscount } from '../../lib/productPricing'
import { isProductSoldOut } from '../../lib/productStock'
import type { Product } from '../../lib/types'
import { HotProductBadge } from './HotProductBadge'
import { SaleProductBadge } from './SaleProductBadge'

type BadgeSurface = 'card' | 'detail'

interface ProductImageBadgesProps {
  product: Product
  className?: string
  /** card：列表；detail：詳情（熱門避開關閉鈕） */
  surface?: BadgeSurface
}

/** 商品圖角標：熱門右上、特價左下 */
export function ProductImageBadges({
  product,
  className = '',
  surface = 'card',
}: ProductImageBadgesProps) {
  const isSold = isProductSoldOut(product)
  const showHot = product.is_hot
  const showSale = !isSold && hasProductDiscount(product)
  const isDetail = surface === 'detail'

  if (!showHot && !showSale) return null

  const hotPosition = isDetail
    ? 'absolute right-3 top-14 z-20'
    : 'absolute right-3 top-3 z-20'

  return (
    <>
      {showHot && (
        <HotProductBadge
          className={`pointer-events-none backdrop-blur-sm ${hotPosition} ${className}`}
        />
      )}
      {showSale && (
        <SaleProductBadge
          product={product}
          className={`pointer-events-none absolute bottom-3 left-3 z-20 backdrop-blur-sm ${className}`}
        />
      )}
    </>
  )
}
