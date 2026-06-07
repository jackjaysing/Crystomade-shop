import { SITE_DESCRIPTION, SITE_NAME } from '../../constants/siteMeta'
import { absoluteUrl } from '../../lib/siteMeta'
import { StructuredDataScript } from './StructuredDataScript'

/** 全站 WebSite JSON-LD */
export function WebSiteStructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/products'),
    description: SITE_DESCRIPTION,
    inLanguage: 'zh-TW',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  }

  return <StructuredDataScript id="website-structured-data" data={data} />
}
