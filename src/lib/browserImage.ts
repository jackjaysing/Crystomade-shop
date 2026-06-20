const DISPLAYABLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

const DISPLAYABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const CONVERTIBLE_CAMERA_EXTENSIONS = new Set(['heic', 'heif', 'dng'])

function fileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function isDisplayableImageFile(file: File): boolean {
  const ext = fileExtension(file)
  if (ext && DISPLAYABLE_EXTENSIONS.has(ext)) return true
  if (file.type && DISPLAYABLE_MIME_TYPES.has(file.type.toLowerCase())) return true
  return false
}

/** 瀏覽器 <img> 可顯示的圖片網址 */
export function isBrowserDisplayableImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ext ? DISPLAYABLE_EXTENSIONS.has(ext) : false
}

/** 上傳前檢查：拒絕 DNG、HEIC 等瀏覽器無法顯示的格式 */
export function assertBrowserDisplayableImageFile(file: File): void {
  if (isDisplayableImageFile(file)) return

  throw new Error(
    '請上傳 JPG、PNG、WebP 或 GIF 圖片（不支援 DNG、HEIC 等相機原檔）'
  )
}

/** 手機相簿、相機皆可（含 HEIC，上傳時自動處理） */
export const BROWSER_IMAGE_ACCEPT = 'image/*'

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

const CAMERA_CONVERT_ERROR = '無法讀取這張照片，請改選其他照片或從相簿挑選'

function isLikelyPhoneImage(file: File): boolean {
  const mime = file.type.toLowerCase()
  if (mime.startsWith('image/')) return true
  const ext = fileExtension(file)
  if (CONVERTIBLE_CAMERA_EXTENSIONS.has(ext)) return true
  if (DISPLAYABLE_EXTENSIONS.has(ext)) return true
  // iPhone 相簿常見：無副檔名或 IMG_ 開頭
  if (!ext && file.size > 0) return true
  return /^img[_-]/i.test(file.name)
}

async function convertImageFileToJpeg(file: File): Promise<File> {
  let bitmap: ImageBitmap | null = null
  let canvas: HTMLCanvasElement | null = null
  try {
    bitmap = await createImageBitmap(file)
    canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(CAMERA_CONVERT_ERROR)

    ctx.drawImage(bitmap, 0, 0)
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
    if (!blob) throw new Error(CAMERA_CONVERT_ERROR)

    const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'photo'
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    bitmap?.close()
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}

/**
 * 統一處理手機／相機照片（含 HEIC）；已是 JPG／PNG 等則原樣回傳。
 */
export async function normalizeImageFileForUpload(file: File): Promise<File> {
  if (isDisplayableImageFile(file)) return file
  if (!isLikelyPhoneImage(file)) {
    throw new Error('請選擇圖片檔案')
  }

  try {
    return await convertImageFileToJpeg(file)
  } catch {
    throw new Error(CAMERA_CONVERT_ERROR)
  }
}

/**
 * 上傳前自動壓縮（縮邊 + JPEG/PNG），降低 Storage egress。
 * GIF 動圖與已足夠小的圖片會略過。
 */
export async function compressImageForUpload(
  file: File,
  preset: UploadImagePreset = 'product'
): Promise<File> {
  const normalized = await normalizeImageFileForUpload(file)

  if (normalized.type === 'image/gif' || normalized.type === 'image/svg+xml') {
    return normalized
  }

  const { maxEdge, jpegQuality, maxBytes } = UPLOAD_PRESETS[preset]

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(normalized)
    const target = scaledDimensions(bitmap.width, bitmap.height, maxEdge)
    const alreadySmall =
      target.width === bitmap.width &&
      target.height === bitmap.height &&
      normalized.size <= maxBytes

    if (alreadySmall) {
      return normalized
    }

    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return normalized

    ctx.drawImage(bitmap, 0, 0, target.width, target.height)
    const keepPng =
      normalized.type === 'image/png' &&
      canvasHasAlpha(ctx, target.width, target.height)

    if (keepPng) {
      const blob = await canvasToBlob(canvas, 'image/png')
      if (!blob || blob.size >= normalized.size) return normalized
      return new File([blob], buildOutputName(normalized, 'png'), {
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

    if (!blob || blob.size >= normalized.size) return normalized

    return new File([blob], buildOutputName(normalized, 'jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return normalized
  } finally {
    bitmap?.close()
  }
}
