import type { Product } from '../../lib/types'
import { ProductCard } from './ProductCard'

interface ProductMasonryProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

export function ProductMasonry({ products, onProductClick }: ProductMasonryProps) {
  return (
    // 這裡改用 grid 排版，並讓內部卡片等高 (items-stretch)
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 items-stretch sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div key={product.id} className="flex flex-col h-full">
          <ProductCard
            product={product}
            onClick={() => onProductClick(product)}
          />
        </div>
      ))}
    </div>
  );
}