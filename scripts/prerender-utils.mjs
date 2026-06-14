import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export function loadEnvFile(path) {
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

export function loadProjectEnv() {
  const root = resolve(process.cwd())
  return {
    ...loadEnvFile(resolve(root, '.env')),
    ...loadEnvFile(resolve(root, '.env.local')),
    ...loadEnvFile(resolve(root, '.env.production')),
  }
}

const DEFAULT_SITE_URL = 'https://crystomade-shop.vercel.app'

function normalizeSiteUrl(value) {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function resolveSiteUrl(fileEnv = {}) {
  const fromEnv = process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL
  if (fromEnv?.trim()) return `https://${normalizeSiteUrl(fromEnv)}`

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (productionHost?.trim()) return `https://${normalizeSiteUrl(productionHost)}`

  return DEFAULT_SITE_URL
}

export function createSupabaseFromEnv(fileEnv = {}) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export function slugifyProductName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\/\\?#&%+]+/g, '')
    .slice(0, 80)
}

export function productSlug(product) {
  const namePart = slugifyProductName(product.name)
  return namePart ? `${namePart}-${product.id}` : product.id
}

export function productDetailPath(product) {
  return `/products/${encodeURIComponent(productSlug(product))}`
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function calcSalePrice(originalPrice, discountZhe) {
  if (originalPrice <= 0) return 0
  const zhe = discountZhe ?? null
  if (zhe == null || zhe <= 0 || zhe >= 10) return originalPrice
  return Math.max(1, Math.round(originalPrice * (zhe / 10)))
}

export function truncateText(text, max = 160) {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1)}…`
}
