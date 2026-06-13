/**
 * 診斷本機能否連上 Supabase（不輸出金鑰）
 * 用法：node scripts/diagnose-supabase.mjs
 */
import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

async function loadEnv() {
  let text = ''
  try {
    text = await fs.readFile('.env', 'utf8')
  } catch {
    console.error('找不到 .env，請確認 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY 已設定')
    process.exit(1)
  }
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[trimmed.slice(0, idx).trim()] = value
  }
  return env
}

async function probe(label, target, headers = {}) {
  try {
    const res = await fetch(target, { method: 'GET', headers })
    console.log(`[ok] ${label} → HTTP ${res.status}`)
    return true
  } catch (e) {
    const cause = e?.cause
    console.log(
      `[fail] ${label} → ${cause?.code || cause?.message || e.message || String(e)}`
    )
    return false
  }
}

const env = await loadEnv()
const url = env.VITE_SUPABASE_URL?.trim()
const key = env.VITE_SUPABASE_ANON_KEY?.trim()

console.log('--- Supabase 連線診斷 ---\n')

if (!url || !key) {
  console.error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

let host = ''
try {
  host = new URL(url).host
  console.log(`Project host: ${host}`)
  console.log(`Anon key 長度: ${key.length} 字元`)
  console.log(`Anon key 開頭: ${key.slice(0, 15)}...`)
} catch {
  console.error('VITE_SUPABASE_URL 格式不正確，應為 https://xxxxx.supabase.co')
  process.exit(1)
}

console.log('')
await probe('REST API', `${url}/rest/v1/`, {
  apikey: key,
  Authorization: `Bearer ${key}`,
})
await probe('Storage API', `${url}/storage/v1/`)

console.log('')
const supabase = createClient(url, key)

const products = await supabase.from('products').select('id').limit(1)
if (products.error) {
  console.log(`[fail] 讀取 products → ${products.error.message}`)
} else {
  console.log('[ok] 讀取 products 成功')
}

const storage = await supabase.storage.from('product-images').list('', { limit: 3 })
if (storage.error) {
  console.log(`[fail] 列出 Storage → ${storage.error.message}`)
} else {
  console.log(`[ok] 列出 Storage 成功（${storage.data?.length ?? 0} 筆）`)
}

console.log('\n若全部 [ok]，可執行 npm run compress:storage')
console.log('若 [fail] fetch failed / ENOTFOUND / CERT：請檢查 .env 網址、防毒、或等 Pro 生效')
