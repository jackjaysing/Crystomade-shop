import { compressImageForUpload } from './browserImage'
import { deliverDownloadFile } from './deliverDownloadFile'
import { applyCrystomadeWatermark } from './watermarkProductImage'

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

let downloadQueue: Promise<void> = Promise.resolve()

async function fileFromImageSource(source: File | string): Promise<File> {
  if (source instanceof File) return source

  const response = await fetch(source, { cache: 'no-store' })
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

async function prepareImageForWatermark(file: File): Promise<File> {
  if (!isMobileDevice()) return file
  return compressImageForUpload(file, 'product')
}

function runQueuedDownload(task: () => Promise<void>): Promise<void> {
  const next = downloadQueue.then(task, task)
  downloadQueue = next.catch(() => undefined)
  return next
}

/** 下載已壓 Crystomade 浮水印的圖片（與上架後前台顯示一致） */
export async function downloadWatermarkedImage(
  source: File | string,
  filenameBase: string
): Promise<void> {
  await runQueuedDownload(async () => {
    const original = await prepareImageForWatermark(
      await fileFromImageSource(source)
    )
    const watermarked = await applyCrystomadeWatermark(original)
    const safeBase =
      filenameBase.replace(/[^\w\u4e00-\u9fff-]+/g, '_').replace(/^_|_$/g, '') ||
      'crystomade'
    const ext = watermarked.name.split('.').pop() ?? 'jpg'
    const finalName = `${safeBase}-watermark-${Date.now()}.${ext}`

    await deliverDownloadFile(
      new File([watermarked], finalName, {
        type: watermarked.type,
        lastModified: watermarked.lastModified,
      })
    )
  })
}
