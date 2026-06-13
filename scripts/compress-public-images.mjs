/**
 * 壓縮 public/ 靜態圖片（Logo、OG 分享圖）
 * 用法：node scripts/compress-public-images.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const publicDir = path.resolve('public')
const backupDir = path.join(publicDir, '_originals')

const JOBS = [
  {
    file: 'logomark.png',
    backup: true,
    async transform(img) {
      return img
        .resize(192, 192, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
    },
  },
  {
    file: 'logoword.png',
    backup: true,
    async transform(img) {
      return img
        .resize(512, null, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
    },
  },
  {
    file: 'logo.png',
    backup: true,
    async transform(img) {
      return img
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
    },
  },
  {
    file: 'og-share-square.jpg',
    backup: true,
    async transform(img) {
      return img
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
    },
  },
  {
    file: 'og-share.jpg',
    backup: true,
    async transform(img) {
      return img
        .resize(1200, 630, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
    },
  },
]

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function ensureBackupDir() {
  await fs.mkdir(backupDir, { recursive: true })
}

async function compressOne(job) {
  const target = path.join(publicDir, job.file)
  try {
    await fs.access(target)
  } catch {
    console.log(`[skip] 找不到 ${job.file}`)
    return
  }

  const before = (await fs.stat(target)).size
  const meta = await sharp(target).metadata()
  const input = sharp(target, { failOn: 'none' })

  if (job.backup) {
    const backupPath = path.join(backupDir, job.file)
    try {
      await fs.access(backupPath)
    } catch {
      await fs.copyFile(target, backupPath)
      console.log(`[backup] ${job.file} → public/_originals/`)
    }
  }

  const buffer = await job.transform(input)
  const tmp = `${target}.tmp`
  await fs.writeFile(tmp, buffer)
  await fs.rename(tmp, target)

  const after = (await fs.stat(target)).size
  const saved = before - after
  const pct = before > 0 ? ((saved / before) * 100).toFixed(0) : '0'
  console.log(
    `[ok] ${job.file} ${meta.width ?? '?'}×${meta.height ?? '?'}：${formatKb(before)} → ${formatKb(after)}（省 ${pct}%）`
  )
}

await ensureBackupDir()
console.log('壓縮 public/ 靜態圖片…\n')
for (const job of JOBS) {
  await compressOne(job)
}
console.log('\n完成。原圖備份於 public/_originals/')
