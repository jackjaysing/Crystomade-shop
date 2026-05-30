/**
 * 診斷 Supabase 連線（本地執行，不輸出完整金鑰）
 * 執行：node scripts/test-supabase.mjs
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envText = readFileSync(resolve(root, '.env'), 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

console.log('URL:', url)
console.log('Key prefix:', key ? key.slice(0, 20) + '...' : '(empty)')
console.log('Key length:', key?.length ?? 0)

if (!url || !key) {
  console.error('FAIL: missing URL or key in .env')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data, error, status } = await supabase.from('products').select('id,name').limit(3)

if (error) {
  console.error('FAIL status:', status)
  console.error('FAIL code:', error.code)
  console.error('FAIL message:', error.message)
  console.error('FAIL details:', error.details)
  console.error('FAIL hint:', error.hint)
  process.exit(1)
}

console.log('OK: products count', data?.length ?? 0)
console.log(JSON.stringify(data, null, 2))
