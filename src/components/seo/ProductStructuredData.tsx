import { getProductCategoryLabel } from '../../constants/categories'
import { SITE_NAME } from '../../constants/siteMeta'
import { getProductSalePrice } from '../../lib/productPricing'
import { productDetailPath } from '../../lib/productSlug'
import { isProductSoldOut } from '../../lib/productStock'
import { absoluteUrl } from '../../lib/siteMeta'
import type { Product } from '../../lib/types'
import { StructuredDataScript } from './StructuredDataScript'

interface ProductStructuredDataProps {
  product: Product
}

/** 商品詳情頁 Product JSON-LD */
export function ProductStructuredData({ product }: ProductStructuredDataProps) {
  const isSold = isProductSoldOut(product)
  const price = getProductSalePrice(product)

  const productUrl = absoluteUrl(productDetailPath(product))

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description.trim() || undefined,
    image: [product.image_url, ...product.gallery_urls].filter(Boolean),
    sku: product.id,
    url: productUrl,
    category: getProductCategoryLabel(product),
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'TWD',
      price: String(price),
      availability: isSold
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  }

  return <StructuredDataScript id="product-structured-data" data={data} />
}
