import { useMemo } from 'react'
import { absoluteUrl } from '../../lib/siteMeta'
import { StructuredDataScript } from './StructuredDataScript'

export interface BreadcrumbItem {
  name: string
  path: string
}

interface BreadcrumbStructuredDataProps {
  items: BreadcrumbItem[]
}

/** BreadcrumbList JSON-LD */
export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  const data = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    }),
    [items]
  )

  return <StructuredDataScript id="breadcrumb-structured-data" data={data} />
}
