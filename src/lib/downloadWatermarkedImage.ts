import { applyCrystomadeWatermark } from './watermarkProductImage'

async function fileFromImageSource(source: File | string): Promise<File> {
  if (source instanceof File) return source

  const response = await fetch(source)
  if (!response.ok) throw new Error('無法載入圖片，請稍後再試')

  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) {
    throw new Error('檔案不是有效的圖片格式')
  }

  const urlPath = source.split('?')[0]
  const extFromUrl = urlPath.split('.').pop()?.toLowerCase()
  const ext =
    extFromUrl && ['jpg', 'jpeg', 'png', 'webp'].includes(extFromUrl)
      ? extFromUrl === 'jpeg'
        ? 'jpg'
        : extFromUrl
      : blob.type.includes('png')
        ? 'png'
        : 'jpg'

  return new File([blob], `image.${ext}`, { type: blob.type || 'image/jpeg' })
}

function triggerFileDownload(file: File): void {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** 下載已壓 Crystomade 浮水印的圖片（與上架後前台顯示一致） */
export async function downloadWatermarkedImage(
  source: File | string,
  filenameBase: string
): Promise<void> {
  const original = await fileFromImageSource(source)
  const watermarked = await applyCrystomadeWatermark(original)
  const safeBase =
    filenameBase.replace(/[^\w\u4e00-\u9fff-]+/g, '_').replace(/^_|_$/g, '') ||
    'crystomade'
  const ext = watermarked.name.split('.').pop() ?? 'jpg'
  const finalName = `${safeBase}-watermark.${ext}`
  triggerFileDownload(
    new File([watermarked], finalName, {
      type: watermarked.type,
      lastModified: watermarked.lastModified,
    })
  )
}
