import { SITE_DESCRIPTION, SITE_NAME } from '../../constants/siteMeta'
import { INSTAGRAM_URL, LINE_COMMUNITY_URL } from '../../constants/social'
import { LINE_OFFICIAL_URL } from '../../constants/line'
import { absoluteUrl } from '../../lib/siteMeta'
import { StructuredDataScript } from './StructuredDataScript'

/** 全站 Organization JSON-LD */
export function OrganizationStructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/products'),
    logo: absoluteUrl('/logomark.png'),
    description: SITE_DESCRIPTION,
    sameAs: [INSTAGRAM_URL, LINE_OFFICIAL_URL, LINE_COMMUNITY_URL],
  }

  return <StructuredDataScript id="organization-structured-data" data={data} />
}
