import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import {
  calcSalePrice,
  createSupabaseFromEnv,
  escapeHtml,
  loadProjectEnv,
  productDetailPath,
  productSlug,
  resolveSiteUrl,
  truncateText,
} from './prerender-utils.mjs'

const SITE_NAME = '晶刻 Crystomade'
const root = resolve(process.cwd())
const distDir = resolve(root, 'dist')
const distIndexPath = resolve(distDir, 'index.html')

function extractViteAssets(indexHtml) {
  const scripts = [
    ...indexHtml.matchAll(/<script[^>]+src="([^"]+)"/g),
  ].map((match) => match[1])
  const styles = [
    ...indexHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
  ].map((match) => match[1])
  return { scripts, styles }
}

function isSoldOut(product) {
  return product.status === 'sold' || Number(product.stock) <= 0
}

function resolveImageSrc(imageUrl, siteUrl) {
  const trimmed = String(imageUrl || '').trim()
  if (!trimmed) return `${siteUrl}/og-share-square.jpg?v=2`
  if (trimmed.startsWith('http')) return trimmed
  return `${siteUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

function buildProductHtml({ product, siteUrl, assets }) {
  const pathname = productDetailPath(product)
  const pageUrl = `${siteUrl}${pathname}`
  const title = `${product.name}｜${SITE_NAME}`
  const description =
    truncateText(product.description) ||
    '晶刻 Crystomade 天然水晶商品，五行平衡、水晶手串客製與能量水晶選品。'
  const price = calcSalePrice(Number(product.price), product.discount_zhe)
  const imageUrl = String(product.image_url || '').trim()
  const absoluteImage = resolveImageSrc(imageUrl, siteUrl)
  const availability = isSoldOut(product) ? 'OutOfStock' : 'InStock'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: truncateText(product.description, 500) || undefined,
    image: imageUrl ? [absoluteImage] : undefined,
    sku: product.id,
    url: pageUrl,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'TWD',
      price: String(price),
      availability: `https://schema.org/${availability}`,
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  }

  const styleTags = assets.styles
    .map((href) => `<link rel="stylesheet" crossorigin href="${href}">`)
    .join('\n    ')
  const scriptTags = assets.scripts
    .map((src) => `<script type="module" crossorigin src="${src}"></script>`)
    .join('\n    ')

  const imgTag = imageUrl
    ? `<img src="${escapeHtml(absoluteImage)}" alt="${escapeHtml(product.name)}" style="max-width:100%;border-radius:0.75rem;margin-bottom:1rem" />`
    : ''

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(absoluteImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(absoluteImage)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    ${styleTags}
  </head>
  <body style="margin:0;background:#0a0b0f;color:#fff">
    <div id="root">
      <main style="max-width:48rem;margin:0 auto;padding:6rem 1.5rem 2rem;font-family:'Noto Sans TC',sans-serif;line-height:1.7">
        <nav style="margin-bottom:1.5rem;font-size:0.875rem">
          <a href="/products" style="color:#d4a853">典藏選購</a>
          <span style="color:#666"> / </span>
          <span style="color:#ccc">${escapeHtml(product.name)}</span>
        </nav>
        <h1 style="font-size:1.75rem;margin:0 0 1rem">${escapeHtml(product.name)}</h1>
        ${imgTag}
        <p style="color:#d4a853;font-size:1.125rem;margin:0 0 1rem">NT$ ${price.toLocaleString('zh-TW')}</p>
        <p style="color:#b8b8c8;margin:0 0 1.5rem;white-space:pre-wrap">${escapeHtml(product.description || '')}</p>
        <p style="margin:0">
          <a href="${escapeHtml(pathname)}" style="color:#d4a853">在晶刻 Crystomade 查看完整商品頁</a>
        </p>
      </main>
    </div>
    ${scriptTags}
  </body>
</html>
`
}

async function fetchProductRows(supabase) {
  const primary = await supabase
    .from('products')
    .select('id,name,description,image_url,price,discount_zhe,status,stock')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (!primary.error) return primary

  if (/sort_order|42703|column/i.test(primary.error.message)) {
    return supabase
      .from('products')
      .select('id,name,description,image_url,price,discount_zhe,status,stock')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  }

  return primary
}

async function main() {
  let indexHtml
  try {
    indexHtml = readFileSync(distIndexPath, 'utf8')
  } catch {
    console.error('[prerender] 找不到 dist/index.html，請先執行 vite build')
    process.exit(1)
  }

  const fileEnv = loadProjectEnv()
  const siteUrl = resolveSiteUrl(fileEnv)
  const supabase = createSupabaseFromEnv(fileEnv)
  const assets = extractViteAssets(indexHtml)

  if (!supabase) {
    console.warn('[prerender] 未設定 Supabase，略過商品頁預渲染')
    return
  }

  const { data, error } = await fetchProductRows(supabase)
  if (error) {
    console.warn(`[prerender] 無法讀取商品，略過預渲染：${error.message}`)
    return
  }

  let written = 0
  for (const product of data) {
    const html = buildProductHtml({ product, siteUrl, assets })
    const outPath = resolve(
      distDir,
      'products',
      encodeURIComponent(productSlug(product)),
      'index.html'
    )
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, html, 'utf8')
    written += 1
  }

  console.log(`[prerender] 已產生 ${written} 個商品靜態頁（供 Google 收錄）`)
}

await main()
