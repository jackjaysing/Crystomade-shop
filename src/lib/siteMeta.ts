import { getPageMeta, type PageMeta } from '../constants/pageMeta'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_PATH,
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

function applyMetaBundle(meta: PageMeta, pathname: string, imagePath = SITE_OG_IMAGE_PATH) {
  document.title = meta.title

  upsertMeta(
    'meta[name="description"]',
    () => {
      const el = document.createElement('meta')
      el.name = 'description'
      return el
    },
    meta.description
  )

  if (meta.keywords) {
    upsertMeta(
      'meta[name="keywords"]',
      () => {
        const el = document.createElement('meta')
        el.name = 'keywords'
        return el
      },
      meta.keywords
    )
  }

  const pageUrl = absoluteUrl(pathname)
  upsertLink('canonical', pageUrl)

  const ogImage = absoluteUrl(imagePath)
  const ogPairs: Array<[string, string]> = [
    ['og:site_name', SITE_NAME],
    ['og:type', 'website'],
    ['og:title', meta.title],
    ['og:description', meta.description],
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
    ['twitter:title', meta.title],
    ['twitter:description', meta.description],
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

/** 套用全站預設 title／description／OG（商品彈窗關閉時還原用） */
export function applyDefaultSiteMeta(pathname = '/products') {
  applyMetaBundle(getPageMeta(pathname), pathname)
}

/** 依路由套用各頁 SEO 文案 */
export function applyPageMeta(pathname: string) {
  applyMetaBundle(getPageMeta(pathname), pathname)
}

export interface ProductShareMeta {
  name: string
  description: string
  imageUrl?: string | null
  pathname: string
}

/** 商品詳情頁更新 title／description／OG／canonical */
export function applyProductSiteMeta(product: ProductShareMeta) {
  const title = `${product.name}｜${SITE_NAME}`
  const description =
    product.description.trim().slice(0, 160) || SITE_DESCRIPTION
  const pageUrl = absoluteUrl(product.pathname)

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

  upsertLink('canonical', pageUrl)

  const image = product.imageUrl?.trim()
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : absoluteUrl(SITE_OG_IMAGE_PATH)

  const ogPairs: Array<[string, string]> = [
    ['og:site_name', SITE_NAME],
    ['og:type', 'product'],
    ['og:title', title],
    ['og:description', description],
    ['og:url', pageUrl],
    ['og:image', ogImage],
    ['og:image:alt', `${product.name}天然水晶商品照片`],
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
    ['twitter:title', title],
    ['twitter:description', description],
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

export { absoluteUrl, resolveSiteOrigin }
