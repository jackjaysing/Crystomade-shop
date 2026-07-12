/** 圓形裁切：把預覽區中的圓形範圍輸出為 PNG（透明背景） */

export interface CircularCropTransform {
  /** 圖片中心相對視窗中心的位移（預覽座標 px） */
  offsetX: number
  offsetY: number
  /** 相對「剛好蓋住圓」的倍率，1 = cover */
  zoom: number
}

export const CIRCULAR_CROP_VIEW_SIZE = 320
export const CIRCULAR_CROP_OUTPUT_SIZE = 512
export const CIRCULAR_CROP_ZOOM_MIN = 1
export const CIRCULAR_CROP_ZOOM_MAX = 4

/** 讓圖片最短邊剛好蓋住圓直徑的基礎縮放 */
export function circularCropCoverScale(
  imageWidth: number,
  imageHeight: number,
  viewSize = CIRCULAR_CROP_VIEW_SIZE
): number {
  const diameter = viewSize
  return diameter / Math.min(imageWidth, imageHeight)
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('無法載入圖片'))
    img.src = url
  })
}

/**
 * 依預覽視窗的位移／縮放，輸出圓形透明 PNG。
 */
export async function exportCircularCroppedPng(
  source: HTMLImageElement | ImageBitmap,
  transform: CircularCropTransform,
  options?: {
    viewSize?: number
    outputSize?: number
    fileName?: string
  }
): Promise<File> {
  const viewSize = options?.viewSize ?? CIRCULAR_CROP_VIEW_SIZE
  const outputSize = options?.outputSize ?? CIRCULAR_CROP_OUTPUT_SIZE
  const imgW = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width
  const imgH = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height

  const cover = circularCropCoverScale(imgW, imgH, viewSize)
  const scale = cover * Math.max(CIRCULAR_CROP_ZOOM_MIN, transform.zoom)
  const displayW = imgW * scale
  const displayH = imgH * scale
  const imgLeft = viewSize / 2 + transform.offsetX - displayW / 2
  const imgTop = viewSize / 2 + transform.offsetY - displayH / 2

  const ratio = outputSize / viewSize
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立畫布')

  ctx.clearRect(0, 0, outputSize, outputSize)
  ctx.save()
  ctx.beginPath()
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(
    source,
    imgLeft * ratio,
    imgTop * ratio,
    displayW * ratio,
    displayH * ratio
  )
  ctx.restore()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new Error('圓形裁切失敗')

  const base =
    options?.fileName?.replace(/\.[^.]+$/, '').trim() ||
    `bead-${Date.now()}`
  return new File([blob], `${base}.png`, {
    type: 'image/png',
    lastModified: Date.now(),
  })
}
