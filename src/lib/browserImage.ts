const DISPLAYABLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

const DISPLAYABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/** 瀏覽器 <img> 可顯示的圖片網址 */
export function isBrowserDisplayableImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ext ? DISPLAYABLE_EXTENSIONS.has(ext) : false
}

/** 上傳前檢查：拒絕 DNG、HEIC 等瀏覽器無法顯示的格式 */
export function assertBrowserDisplayableImageFile(file: File): void {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext && DISPLAYABLE_EXTENSIONS.has(ext)) return
  if (file.type && DISPLAYABLE_MIME_TYPES.has(file.type.toLowerCase())) return

  throw new Error(
    '請上傳 JPG、PNG、WebP 或 GIF 圖片（不支援 DNG、HEIC 等相機原檔）'
  )
}

export const BROWSER_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export type UploadImagePreset = 'product' | 'banner' | 'card'

const UPLOAD_PRESETS: Record<
  UploadImagePreset,
  { maxEdge: number; jpegQuality: number; maxBytes: number }
> = {
  product: { maxEdge: 1200, jpegQuality: 0.82, maxBytes: 280_000 },
  banner: { maxEdge: 1600, jpegQuality: 0.85, maxBytes: 320_000 },
  card: { maxEdge: 1000, jpegQuality: 0.8, maxBytes: 200_000 },
}

function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height }
  }
  const scale = maxEdge / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasHasAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const sampleW = Math.min(width, 96)
  const sampleH = Math.min(height, 96)
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

function buildOutputName(file: File, ext: 'jpg' | 'png'): string {
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${baseName}.${ext}`
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality)
  })
}

/**
 * 上傳前自動壓縮（縮邊 + JPEG/PNG），降低 Storage egress。
 * GIF 動圖與已足夠小的圖片會略過。
 */
export async function compressImageForUpload(
  file: File,
  preset: UploadImagePreset = 'product'
): Promise<File> {
  assertBrowserDisplayableImageFile(file)

  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file
  }

  const { maxEdge, jpegQuality, maxBytes } = UPLOAD_PRESETS[preset]

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const target = scaledDimensions(bitmap.width, bitmap.height, maxEdge)
    const alreadySmall =
      target.width === bitmap.width &&
      target.height === bitmap.height &&
      file.size <= maxBytes

    if (alreadySmall) {
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, target.width, target.height)
    const keepPng = file.type === 'image/png' && canvasHasAlpha(ctx, target.width, target.height)

    if (keepPng) {
      const blob = await canvasToBlob(canvas, 'image/png')
      if (!blob || blob.size >= file.size) return file
      return new File([blob], buildOutputName(file, 'png'), {
        type: 'image/png',
        lastModified: Date.now(),
      })
    }

    let quality = jpegQuality
    let blob: Blob | null = null
    for (let attempt = 0; attempt < 4; attempt += 1) {
      blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      if (!blob) break
      if (blob.size <= maxBytes || quality <= 0.62) break
      quality -= 0.08
    }

    if (!blob || blob.size >= file.size) return file

    return new File([blob], buildOutputName(file, 'jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}
