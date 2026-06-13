import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, 'utf8')
    const env = {}
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      let value = trimmed.slice(idx + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
    return env
  } catch {
    return {}
  }
}

function slugifyProductName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\/\\?#&%+]+/g, '')
    .slice(0, 80)
}

function productSlug(product) {
  const namePart = slugifyProductName(product.name)
  return namePart ? `${namePart}-${product.id}` : product.id
}

function productDetailPath(product) {
  return `/products/${encodeURIComponent(productSlug(product))}`
}

function academyArticlePath(slug) {
  return `/academy/${encodeURIComponent(String(slug || ''))}`
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(siteUrl, path, { changefreq = 'weekly', priority = '0.8', lastmod } = {}) {
  const loc = `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
  ]
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`)
  lines.push(`    <changefreq>${changefreq}</changefreq>`)
  lines.push(`    <priority>${priority}</priority>`)
  lines.push('  </url>')
  return lines.join('\n')
}

const root = resolve(process.cwd())
const fileEnv = {
  ...loadEnvFile(resolve(root, '.env')),
  ...loadEnvFile(resolve(root, '.env.local')),
  ...loadEnvFile(resolve(root, '.env.production')),
}

const DEFAULT_SITE_URL = 'https://crystomade-shop.vercel.app'

function normalizeSiteUrl(value) {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function resolveSiteUrl() {
  const fromEnv = process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL
  if (fromEnv?.trim()) return `https://${normalizeSiteUrl(fromEnv)}`

  // 勿用 VERCEL_URL：每次部署會變成 crystomade-shop-xxxx.vercel.app，GSC 無法擷取
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (productionHost?.trim()) return `https://${normalizeSiteUrl(productionHost)}`

  return DEFAULT_SITE_URL
}

const siteUrl = resolveSiteUrl()
const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY
function warnSitemapIssue(message) {
  console.warn(`[sitemap] ${message}`)
}

const lastmod = new Date().toISOString().slice(0, 10)

const staticPages = [
  // 首頁 / 以 301 導向 /products，勿列入 sitemap 避免與典藏頁重複
  { path: '/products', changefreq: 'daily', priority: '1.0' },
  { path: '/academy', changefreq: 'weekly', priority: '0.8' },
  { path: '/register', changefreq: 'monthly', priority: '0.6' },
  { path: '/point-shop', changefreq: 'weekly', priority: '0.7' },
  { path: '/wish-board', changefreq: 'weekly', priority: '0.6' },
]

let productPages = []
let academyPages = []

async function fetchProductRows(supabase) {
  const primary = await supabase
    .from('products')
    .select('id,name,created_at')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (!primary.error) return primary

  if (/sort_order|42703|column/i.test(primary.error.message)) {
    return supabase
      .from('products')
      .select('id,name,created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  }

  return primary
}

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await fetchProductRows(supabase)

  if (!error && Array.isArray(data)) {
    productPages = data.map((row) => ({
      path: productDetailPath(row),
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: (row.created_at || lastmod).slice(0, 10),
    }))
    console.log(`[sitemap] 已納入 ${productPages.length} 個商品頁`)
  } else if (error) {
    warnSitemapIssue(`無法讀取商品，僅輸出靜態頁面：${error.message}`)
  }

  const academyResult = await supabase
    .from('academy_articles')
    .select('slug,updated_at,published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (!academyResult.error && Array.isArray(academyResult.data)) {
    academyPages = academyResult.data.map((row) => ({
      path: academyArticlePath(row.slug),
      changefreq: 'monthly',
      priority: '0.7',
      lastmod: (row.updated_at || row.published_at || lastmod).slice(0, 10),
    }))
    console.log(`[sitemap] 已納入 ${academyPages.length} 篇學研文章`)
  }
} else {
  warnSitemapIssue(
    '未設定 Supabase（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY），僅輸出靜態頁面'
  )
}

const body = [
  ...staticPages.map((page) => urlEntry(siteUrl, page.path, { ...page, lastmod })),
  ...productPages.map((page) => urlEntry(siteUrl, page.path, page)),
  ...academyPages.map((page) => urlEntry(siteUrl, page.path, page)),
].join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`

const outPath = resolve(root, 'public', 'sitemap.xml')
writeFileSync(outPath, xml, 'utf8')
const totalUrls = staticPages.length + productPages.length + academyPages.length
console.log(
  `[sitemap] 已寫入 ${outPath}（${totalUrls} 個網址：${staticPages.length} 靜態 + ${productPages.length} 商品 + ${academyPages.length} 學研）`
)
if (!process.env.VITE_SITE_URL && !fileEnv.VITE_SITE_URL) {
  console.warn(
    `[sitemap] 未設定 VITE_SITE_URL，Sitemap 使用 ${siteUrl}（建議在 Vercel 設定正式網域）`
  )
}

const robotsPath = resolve(root, 'public', 'robots.txt')
const robots = `# 晶刻 Crystomade — 搜尋引擎與社群預覽爬蟲

User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /account

User-agent: Googlebot
Allow: /

User-agent: Linespider
Allow: /

User-agent: facebookexternalhit
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
writeFileSync(robotsPath, robots, 'utf8')
console.log(`[sitemap] 已更新 ${robotsPath}（Sitemap: ${siteUrl}/sitemap.xml）`)
