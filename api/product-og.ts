/**
 * 商品分享預覽：社群爬蟲經 vercel.json rewrite 導向此端點，
 * 回傳含商品首圖的 OG HTML（不依賴建置時預渲染）。
 *
 * Query：
 * - slug=名稱-uuid（來自 /products/:slug）
 * - 或 id=uuid
 */

export const config = {
  runtime: 'edge',
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

function parseProductId(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const decoded = decodeURIComponent(trimmed)
    const match = decoded.match(UUID_RE)
    return match ? match[1] : null
  } catch {
    const match = trimmed.match(UUID_RE)
    return match ? match[1] : null
  }
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

function absoluteImage(
  imageUrl: string | null | undefined,
  origin: string
): string {
  const trimmed = String(imageUrl || '').trim()
  if (!trimmed) return `${origin}${DEFAULT_OG_PATH}`
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

function buildOgHtml(input: {
  title: string
  description: string
  pageUrl: string
  imageUrl: string
  productName: string
}): string {
  const { title, description, pageUrl, imageUrl, productName } = input
  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(`${productName}天然水晶商品照片`)}" />
    <link rel="image_src" href="${escapeHtml(imageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  </head>
  <body>
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(productName)}" />
    <h1>${escapeHtml(productName)}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${escapeHtml(pageUrl)}">${SITE_NAME}</a></p>
  </body>
</html>`
}

export default async function handler(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url)
  const origin = reqUrl.origin
  const productId =
    parseProductId(reqUrl.searchParams.get('id') || '') ||
    parseProductId(reqUrl.searchParams.get('slug') || '') ||
    parseProductId(reqUrl.searchParams.get('path') || '')

  if (!productId) {
    return new Response('Missing product id', { status: 400 })
  }

  const supabase = resolveSupabaseConfig()
  if (!supabase) {
    return new Response('Supabase env missing', { status: 500 })
  }

  const apiUrl = new URL(`${supabase.url}/rest/v1/products`)
  apiUrl.searchParams.set('id', `eq.${productId}`)
  apiUrl.searchParams.set('deleted_at', 'is.null')
  apiUrl.searchParams.set('select', 'id,name,description,image_url')
  apiUrl.searchParams.set('limit', '1')

  const response = await fetch(apiUrl.toString(), {
    headers: {
      apikey: supabase.key,
      Authorization: `Bearer ${supabase.key}`,
      Accept: 'application/json',
    },
  })
  if (!response.ok) {
    return new Response('Product lookup failed', { status: 502 })
  }

  const rows = (await response.json()) as Array<{
    id: string
    name: string
    description: string | null
    image_url: string | null
  }>
  const product = rows[0]
  if (!product?.name) {
    return new Response('Not found', { status: 404 })
  }

  const slugParam = reqUrl.searchParams.get('slug') || product.id
  const pagePath = `/products/${encodeURIComponent(
    decodeURIComponent(slugParam).replace(/\/configure\/?$/, '')
  )}`
  const pageUrl = `${origin}${pagePath}`
  const title = `${product.name}｜${SITE_NAME}`
  const description =
    truncateText(product.description || '') ||
    '晶刻 Crystomade 天然水晶商品，五行平衡、水晶手串客製與能量水晶選品。'
  const imageUrl = absoluteImage(product.image_url, origin)

  return new Response(
    buildOgHtml({
      title,
      description,
      pageUrl,
      imageUrl,
      productName: product.name,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=86400',
      },
    }
  )
}
