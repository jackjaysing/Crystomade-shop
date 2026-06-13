/**
 * 壓縮 Supabase Storage（product-images 桶）內過大的圖片
 * 用法：node scripts/compress-storage-images.mjs [--dry-run] [--limit N]
 *
 * 需要 .env 的 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY
 * 若上傳失敗，請在 Supabase 後台確認 Storage 寫入權限或使用 service role key。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'product-images'
const MAX_EDGE = 1200
const JPEG_QUALITY = 82
const PNG_QUALITY = 80
const MIN_BYTES_TO_TOUCH = 120 * 1024

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run')
  const limitIdx = argv.indexOf('--limit')
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1]
      ? Number.parseInt(argv[limitIdx + 1], 10)
      : Infinity
  return { dryRun, limit: Number.isFinite(limit) ? limit : Infinity }
}

async function loadEnv() {
  let text = ''
  try {
    text = await fs.readFile(path.resolve('.env'), 'utf8')
  } catch {
    /* ignore */
  }
  const env = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

async function listAllFiles(supabase, prefix = '') {
  const out = []
  let offset = 0
  const pageSize = 100

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!data || data.length === 0) break

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id == null) {
        const nested = await listAllFiles(supabase, fullPath)
        out.push(...nested)
      } else {
        out.push({
          path: fullPath,
          size: item.metadata?.size ?? null,
        })
      }
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return out
}

function isImagePath(filePath) {
  return /\.(jpe?g|png|webp)$/i.test(filePath)
}

async function compressBuffer(filePath, input) {
  const meta = await sharp(input).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const needsResize = w > MAX_EDGE || h > MAX_EDGE
  const ext = path.extname(filePath).toLowerCase()

  let pipeline = sharp(input, { failOn: 'none' })
  if (needsResize) {
    pipeline = pipeline.resize(MAX_EDGE, MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  if (ext === '.png') {
    return {
      meta,
      contentType: 'image/png',
      buffer: await pipeline
        .png({ compressionLevel: 9, palette: true, quality: PNG_QUALITY, effort: 10 })
        .toBuffer(),
    }
  }

  if (ext === '.webp') {
    return {
      meta,
      contentType: 'image/webp',
      buffer: await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer(),
    }
  }

  return {
    meta,
    contentType: 'image/jpeg',
    buffer: await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
  }
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

const { dryRun, limit } = parseArgs(process.argv.slice(2))
const env = await loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('請在 .env 設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log(
    '提示：若上傳出現 row-level security policy，請在 .env 加入 SUPABASE_SERVICE_ROLE_KEY（僅本機使用，勿 commit），或執行 supabase/migration-add-storage-update-policy.sql\n'
  )
}

const supabase = createClient(url, key)
console.log(
  `${dryRun ? '[dry-run] ' : ''}掃描 Supabase Storage：${BUCKET}\n`
)

let files
try {
  files = await listAllFiles(supabase)
} catch (e) {
  const msg = e.message ?? String(e)
  console.error('無法列出 Storage：', msg)
  if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE|fetch failed/i.test(msg)) {
    console.error(
      '\n本機 SSL 憑證問題（常見：防毒 HTTPS 掃描）。PowerShell 可暫時執行：\n' +
        "  $env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run compress:storage\n"
    )
  }
  process.exit(1)
}

const images = files.filter((f) => isImagePath(f.path))
console.log(`找到 ${images.length} 張圖片\n`)

let processed = 0
let savedTotal = 0
let skipped = 0
let failed = 0

for (const file of images) {
  if (processed >= limit) break

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(file.path)

  if (dlErr || !blob) {
    console.log(`[fail] 下載 ${file.path}：${dlErr?.message ?? 'unknown'}`)
    failed += 1
    continue
  }

  const before = blob.size
  if (before < MIN_BYTES_TO_TOUCH) {
    skipped += 1
    continue
  }

  const input = Buffer.from(await blob.arrayBuffer())
  let compressed
  try {
    compressed = await compressBuffer(file.path, input)
  } catch (e) {
    console.log(`[fail] 處理 ${file.path}：${e.message ?? e}`)
    failed += 1
    continue
  }

  const after = compressed.buffer.length
  if (after >= before * 0.95) {
    skipped += 1
    continue
  }

  const saved = before - after
  const pct = ((saved / before) * 100).toFixed(0)
  console.log(
    `[${dryRun ? 'plan' : 'ok'}] ${file.path} ${compressed.meta.width}×${compressed.meta.height}：${formatKb(before)} → ${formatKb(after)}（省 ${pct}%）`
  )

  if (!dryRun) {
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(file.path, compressed.buffer, {
      upsert: true,
      contentType: compressed.contentType,
      cacheControl: '31536000',
    })
    if (upErr) {
      console.log(`  ↳ 上傳失敗：${upErr.message}`)
      if (/row-level security/i.test(upErr.message)) {
        console.log(
          '  ↳ 請在 Supabase SQL Editor 執行 migration-add-storage-update-policy.sql'
        )
      }
      failed += 1
      continue
    }
  }

  savedTotal += saved
  processed += 1
}

console.log(
  `\n摘要：處理 ${processed} 張，略過 ${skipped} 張，失敗 ${failed} 張，共省 ${formatKb(savedTotal)}`
)
