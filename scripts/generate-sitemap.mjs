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

function resolveSiteUrl() {
  const fromEnv = process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, '')
  const vercelHost = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelHost?.trim()) return `https://${vercelHost.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  return 'https://crystomade-shop.vercel.app'
}

const siteUrl = resolveSiteUrl()
const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY
const lastmod = new Date().toISOString().slice(0, 10)

const staticPages = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/products', changefreq: 'daily', priority: '0.9' },
  { path: '/register', changefreq: 'monthly', priority: '0.6' },
  { path: '/point-shop', changefreq: 'weekly', priority: '0.7' },
  { path: '/wish-board', changefreq: 'weekly', priority: '0.6' },
]

let productPages = []

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('products')
    .select('id,name,created_at')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (!error && Array.isArray(data)) {
    productPages = data.map((row) => ({
      path: productDetailPath(row),
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: (row.created_at || lastmod).slice(0, 10),
    }))
  } else if (error) {
    console.warn('[sitemap] 無法讀取商品，僅輸出靜態頁面：', error.message)
  }
} else {
  console.warn('[sitemap] 未設定 Supabase，僅輸出靜態頁面')
}

const body = [
  ...staticPages.map((page) => urlEntry(siteUrl, page.path, { ...page, lastmod })),
  ...productPages.map((page) => urlEntry(siteUrl, page.path, page)),
].join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`

const outPath = resolve(root, 'public', 'sitemap.xml')
writeFileSync(outPath, xml, 'utf8')
console.log(`[sitemap] 已寫入 ${outPath}（${staticPages.length + productPages.length} 個網址）`)

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
