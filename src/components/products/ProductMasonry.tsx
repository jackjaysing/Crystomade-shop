import type { Product } from '../../lib/types'
import { ProductCard } from './ProductCard'

interface ProductMasonryProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

export function ProductMasonry({ products, onProductClick }: ProductMasonryProps) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-x-3 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div key={product.id} className="flex h-full flex-col">
          <ProductCard
            product={product}
            onClick={() => onProductClick(product)}
          />
        </div>
      ))}
    </div>
  )
}
