import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
  SITE_TITLE,
} from '../constants/siteMeta'

function resolveSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim()
  return fromEnv || 'https://crystomade-shop.vercel.app'
}

function absoluteUrl(path: string): string {
  const origin = resolveSiteOrigin().replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${normalized}`
}

function upsertMeta(
  selector: string,
  create: () => HTMLMetaElement,
  content: string
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

/** 套用全站預設 title／description／OG（商品彈窗關閉時還原用） */
export function applyDefaultSiteMeta(pathname = '/products') {
  document.title = SITE_TITLE

  upsertMeta(
    'meta[name="description"]',
    () => {
      const el = document.createElement('meta')
      el.name = 'description'
      return el
    },
    SITE_DESCRIPTION
  )

  upsertMeta(
    'meta[name="keywords"]',
    () => {
      const el = document.createElement('meta')
      el.name = 'keywords'
      return el
    },
    SITE_KEYWORDS
  )

  const pageUrl = absoluteUrl(pathname)
  upsertLink('canonical', pageUrl)

  const ogImage = absoluteUrl(SITE_OG_IMAGE_PATH)
  const ogPairs: Array<[string, string]> = [
    ['og:site_name', SITE_NAME],
    ['og:title', SITE_TITLE],
    ['og:description', SITE_DESCRIPTION],
    ['og:url', pageUrl],
    ['og:image', ogImage],
    ['og:image:alt', SITE_OG_IMAGE_ALT],
  ]

  for (const [property, content] of ogPairs) {
    upsertMeta(
      `meta[property="${property}"]`,
      () => {
        const el = document.createElement('meta')
        el.setAttribute('property', property)
        return el
      },
      content
    )
  }

  const twitterPairs: Array<[string, string]> = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', SITE_TITLE],
    ['twitter:description', SITE_DESCRIPTION],
    ['twitter:image', ogImage],
  ]

  for (const [name, content] of twitterPairs) {
    upsertMeta(
      `meta[name="${name}"]`,
      () => {
        const el = document.createElement('meta')
        el.name = name
        return el
      },
      content
    )
  }
}

export interface ProductShareMeta {
  name: string
  description: string
  imageUrl?: string | null
}

/** 商品詳情開啟時更新瀏覽器標題與 meta（社群爬蟲仍以靜態 OG 為主） */
export function applyProductSiteMeta(product: ProductShareMeta) {
  const title = `${product.name}｜${SITE_NAME}`
  const description =
    product.description.trim().slice(0, 160) || SITE_DESCRIPTION

  document.title = title

  upsertMeta(
    'meta[name="description"]',
    () => {
      const el = document.createElement('meta')
      el.name = 'description'
      return el
    },
    description
  )

  upsertMeta(
    'meta[property="og:title"]',
    () => {
      const el = document.createElement('meta')
      el.setAttribute('property', 'og:title')
      return el
    },
    title
  )

  upsertMeta(
    'meta[property="og:description"]',
    () => {
      const el = document.createElement('meta')
      el.setAttribute('property', 'og:description')
      return el
    },
    description
  )

  const image = product.imageUrl?.trim()
  if (image) {
    const imageUrl = image.startsWith('http') ? image : absoluteUrl(image)
    upsertMeta(
      'meta[property="og:image"]',
      () => {
        const el = document.createElement('meta')
        el.setAttribute('property', 'og:image')
        return el
      },
      imageUrl
    )
    upsertMeta(
      'meta[name="twitter:image"]',
      () => {
        const el = document.createElement('meta')
        el.name = 'twitter:image'
        return el
      },
      imageUrl
    )
  }
}
