import { useMemo } from 'react'
import { SITE_DESCRIPTION, SITE_TITLE } from '../../constants/siteMeta'
import { productDetailPath } from '../../lib/productSlug'
import { absoluteUrl } from '../../lib/siteMeta'
import type { Product } from '../../lib/types'
import { StructuredDataScript } from './StructuredDataScript'

interface ItemListStructuredDataProps {
  products: Product[]
}

/** 商品列表頁 ItemList JSON-LD */
export function ItemListStructuredData({ products }: ItemListStructuredDataProps) {
  const data = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: absoluteUrl('/products'),
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.name,
        url: absoluteUrl(productDetailPath(product)),
      })),
    }),
    [products]
  )

  return <StructuredDataScript id="item-list-structured-data" data={data} />
}
