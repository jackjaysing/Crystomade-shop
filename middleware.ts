/**
 * 商品詳情頁：把 SPA index.html 的 OG 改成商品首圖。
 * 一律回傳 SPA 殼（不用預渲染 HTML），避免手機直接開啟／複製網址時壞掉。
 */

export const config = {
  matcher: ['/products/:slug', '/products/:slug/configure'],
}

const SITE_NAME = '晶刻 Crystomade'
const DEFAULT_OG_PATH = '/og-share-square.jpg?v=2'

const UUID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncateText(text: string, max = 160): string {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1)}…`
}

function parseProductIdFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'products' || !parts[1]) return null
  const raw = parts[1].trim()
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  const match = decoded.match(UUID_RE) || raw.match(UUID_RE)
  return match ? match[1] : null
}

function resolveSupabaseConfig(): { url: string; key: string } | null {
  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).replace(/\/$/, '')
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  if (!url || !key) return null
  return { url, key }
}

function replaceMetaByProperty(
  html: string,
  property: string,
  content: string
): string {
  const safe = escapeHtml(content)
  const rePropertyFirst = new RegExp(
    `(<meta\\s+[^>]*property=["']${property}["'][^>]*content=["'])[^"']*(["'][^>]*>)`,
    'i'
  )
  if (rePropertyFirst.test(html)) {
    return html.replace(rePropertyFirst, `$1${safe}$2`)
  }
  const reContentFirst = new RegExp(
    `(<meta\\s+[^>]*content=["'])[^"']*(["'][^>]*property=["']${property}["'][^>]*>)`,
    'i'
  )
  if (reContentFirst.test(html)) {
    return html.replace(reContentFirst, `$1${safe}$2`)
  }
  return html.replace(
    /<\/head>/i,
    `    <meta property="${property}" content="${safe}" />\n  </head>`
  )
}

function replaceMetaByName(html: string, name: string, content: string): string {
  const safe = escapeHtml(content)
  const reNameFirst = new RegExp(
    `(<meta\\s+[^>]*name=["']${name}["'][^>]*content=["'])[^"']*(["'][^>]*>)`,
    'i'
  )
  if (reNameFirst.test(html)) {
    return html.replace(reNameFirst, `$1${safe}$2`)
  }
  const reContentFirst = new RegExp(
    `(<meta\\s+[^>]*content=["'])[^"']*(["'][^>]*name=["']${name}["'][^>]*>)`,
    'i'
  )
  if (reContentFirst.test(html)) {
    return html.replace(reContentFirst, `$1${safe}$2`)
  }
  return html.replace(
    /<\/head>/i,
    `    <meta name="${name}" content="${safe}" />\n  </head>`
  )
}

function injectProductMeta(
  html: string,
  meta: {
    title: string
    description: string
    pageUrl: string
    imageUrl: string
    productName: string
  }
): string {
  let next = html
  next = next.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(meta.title)}</title>`
  )
  next = replaceMetaByName(next, 'description', meta.description)
  next = replaceMetaByProperty(next, 'og:type', 'product')
  next = replaceMetaByProperty(next, 'og:site_name', SITE_NAME)
  next = replaceMetaByProperty(next, 'og:title', meta.title)
  next = replaceMetaByProperty(next, 'og:description', meta.description)
  next = replaceMetaByProperty(next, 'og:url', meta.pageUrl)
  next = replaceMetaByProperty(next, 'og:image', meta.imageUrl)
  next = replaceMetaByProperty(next, 'og:image:secure_url', meta.imageUrl)
  next = replaceMetaByProperty(
    next,
    'og:image:alt',
    `${meta.productName}天然水晶商品照片`
  )
  next = replaceMetaByName(next, 'twitter:card', 'summary_large_image')
  next = replaceMetaByName(next, 'twitter:title', meta.title)
  next = replaceMetaByName(next, 'twitter:description', meta.description)
  next = replaceMetaByName(next, 'twitter:image', meta.imageUrl)

  const imageSrcRe =
    /(<link\s+[^>]*rel=["']image_src["'][^>]*href=["'])[^"']*(["'][^>]*>)/i
  if (imageSrcRe.test(next)) {
    next = next.replace(imageSrcRe, `$1${escapeHtml(meta.imageUrl)}$2`)
  } else {
    next = next.replace(
      /<\/head>/i,
      `    <link rel="image_src" href="${escapeHtml(meta.imageUrl)}" />\n  </head>`
    )
  }

  const canonicalRe =
    /(<link\s+[^>]*rel=["']canonical["'][^>]*href=["'])[^"']*(["'][^>]*>)/i
  if (canonicalRe.test(next)) {
    next = next.replace(canonicalRe, `$1${escapeHtml(meta.pageUrl)}$2`)
  }

  return next
}

export default async function middleware(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return

  const url = new URL(request.url)
  const productId = parseProductIdFromPath(url.pathname)
  if (!productId) return

  const supabase = resolveSupabaseConfig()
  if (!supabase) return

  try {
    const apiUrl = new URL(`${supabase.url}/rest/v1/products`)
    apiUrl.searchParams.set('id', `eq.${productId}`)
    apiUrl.searchParams.set('deleted_at', 'is.null')
    apiUrl.searchParams.set('select', 'id,name,description,image_url')
    apiUrl.searchParams.set('limit', '1')

    const [productRes, indexRes] = await Promise.all([
      fetch(apiUrl.toString(), {
        headers: {
          apikey: supabase.key,
          Authorization: `Bearer ${supabase.key}`,
          Accept: 'application/json',
        },
      }),
      fetch(new URL('/index.html', url.origin)),
    ])

    if (!productRes.ok || !indexRes.ok) return

    const rows = (await productRes.json()) as Array<{
      id: string
      name: string
      description: string | null
      image_url: string | null
    }>
    const product = rows[0]
    if (!product?.name) return

    const baseHtml = await indexRes.text()
    if (!baseHtml.includes('id="root"')) return

    const origin = url.origin
    const pageUrl = `${origin}${url.pathname}`
    const title = `${product.name}｜${SITE_NAME}`
    const description =
      truncateText(product.description || '') ||
      '晶刻 Crystomade 天然水晶商品，五行平衡、水晶手串客製與能量水晶選品。'
    const hasCover = Boolean(String(product.image_url || '').trim())
    const imageUrl = hasCover
      ? `${origin}/api/product-cover?id=${encodeURIComponent(product.id)}&v=2`
      : `${origin}${DEFAULT_OG_PATH}`

    const injected = injectProductMeta(baseHtml, {
      title,
      description,
      pageUrl,
      imageUrl,
      productName: product.name,
    })

    return new Response(injected, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
      },
    })
  } catch {
    return
  }
}
