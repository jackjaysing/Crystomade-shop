import type { Product } from '../../lib/types'
import { ProductCard } from './ProductCard'

interface ProductMasonryProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

/**
 * 瀑布流商品網格（純 CSS columns，避免第三方套件在 Vite 下造成白屏）
 */
export function ProductMasonry({ products, onProductClick }: ProductMasonryProps) {
  return (
    <div className="columns-2 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
      {products.map((product) => (
        <div key={product.id} className="mb-4 break-inside-avoid">
          <ProductCard
            product={product}
            onClick={() => onProductClick(product)}
          />
        </div>
      ))}
    </div>
  )
}
