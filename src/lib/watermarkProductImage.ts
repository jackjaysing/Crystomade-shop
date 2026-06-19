const WATERMARK_TEXT = 'Crystomade'
const FONT_FAMILY = 'Zapfino, "Snell Roundhand", "Brush Script MT", cursive'

function outputMimeType(file: File): string {
  if (file.type === 'image/png') return 'image/png'
  if (file.type === 'image/webp') return 'image/webp'
  return 'image/jpeg'
}

function outputExtension(mimeType: string): string {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}

async function ensureWatermarkFont(fontSize: number): Promise<void> {
  if (!document.fonts?.load) return
  try {
    await document.fonts.load(`${fontSize}px ${FONT_FAMILY}`)
    await document.fonts.ready
  } catch {
    /* 系統無 Zapfino 時使用後備字體 */
  }
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fontSize: number
) {
  const minDim = Math.min(width, height)
  const edge = Math.max(10, Math.round(minDim * 0.022))

  ctx.save()
  ctx.font = `normal ${fontSize}px ${FONT_FAMILY}`
  ctx.textBaseline = 'bottom'

  const textWidth = ctx.measureText(WATERMARK_TEXT).width
  const textX = width - edge - textWidth
  const textY = height - edge

  ctx.fillStyle = 'rgba(255, 255, 255, 0.52)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = Math.max(3, Math.round(fontSize * 0.18))
  ctx.fillText(WATERMARK_TEXT, textX, textY)
  ctx.restore()
}

/** 商品圖右下角壓上 Crystomade 浮水印，回傳新檔案供上傳 */
export async function applyCrystomadeWatermark(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file
  }

  let bitmap: ImageBitmap | null = null
  let canvas: HTMLCanvasElement | null = null
  try {
    bitmap = await createImageBitmap(file)
    canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    const outputCanvas = canvas
    const fontSize = Math.max(16, Math.round(Math.min(outputCanvas.width, outputCanvas.height) * 0.044))
    await ensureWatermarkFont(fontSize)

    ctx.drawImage(bitmap, 0, 0)
    drawWatermark(ctx, outputCanvas.width, outputCanvas.height, fontSize)

    const mimeType = outputMimeType(file)
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const timeoutId = window.setTimeout(
        () => reject(new Error('浮水印處理逾時')),
        30_000
      )
      outputCanvas.toBlob(
        (result) => {
          window.clearTimeout(timeoutId)
          resolve(result)
        },
        mimeType,
        mimeType === 'image/jpeg' ? 0.92 : undefined
      )
    })

    if (!blob) return file

    const ext = outputExtension(mimeType)
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'product'
    return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() })
  } catch {
    return file
  } finally {
    bitmap?.close()
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
