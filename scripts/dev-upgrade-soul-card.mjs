/**
 * 開發測試：將指定水晶靈魂卡升級至滿級狀態
 * 執行：node scripts/dev-upgrade-soul-card.mjs <card-id>
 * 需要 .env 的 VITE_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY（或 VITE_SUPABASE_ANON_KEY，僅能讀取）
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const cardId = process.argv[2]?.trim()
if (!cardId) {
  console.error('用法: node scripts/dev-upgrade-soul-card.mjs <card-id>')
  process.exit(1)
}

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

const url = env.VITE_SUPABASE_URL?.trim()
const key =
  env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !key) {
  console.error('請在 .env 設定 VITE_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data: before, error: fetchErr } = await supabase
  .from('crystal_soul_cards')
  .select('id,magic_title,serial_number,magic_status,energy_level,contract_signed_at')
  .eq('id', cardId)
  .maybeSingle()

if (fetchErr) {
  console.error('讀取失敗:', fetchErr.message)
  process.exit(1)
}

if (!before) {
  console.error('找不到卡片:', cardId)
  process.exit(1)
}

console.log('升級前:', {
  magic_title: before.magic_title,
  serial_number: before.serial_number,
  magic_status: before.magic_status,
  energy_level: before.energy_level,
  contract_signed_at: before.contract_signed_at,
})

const now = new Date().toISOString()
const { data: after, error: updateErr } = await supabase
  .from('crystal_soul_cards')
  .update({
    magic_status: 'resonating',
    energy_level: 100,
    contract_signed_at: before.contract_signed_at ?? now,
    awakened_at: now,
    last_purify_at: now,
    last_moon_charge_at: now,
    last_meditation_at: now,
  })
  .eq('id', cardId)
  .select('id,magic_title,serial_number,magic_status,energy_level,contract_signed_at')
  .single()

if (updateErr) {
  console.error('升級失敗:', updateErr.message)
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('提示：請在 .env 加入 SUPABASE_SERVICE_ROLE_KEY 以繞過 RLS')
  }
  process.exit(1)
}

console.log('升級後:', after)
console.log(`\n請重新整理: http://localhost:5173/account/grimoire/${cardId}`)
