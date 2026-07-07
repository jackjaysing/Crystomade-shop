import { FIVE_ELEMENTS, type FiveElement } from '../constants/fiveElements'
import { formatEfficacyTags } from './efficacyTags'
import { resolveSoulCardDisplayHeadlines } from './grimoireFulfillment'
import type { FulfillmentIdCardData } from './fulfillmentIdCardPrint'

const LABEL = {
  eyebrow: 'CRYSTAL GRIMOIRE',
  cardTitle: '水晶魔法身分證',
  serial: '魔法編號',
  birthDate: '出生日期',
  affiliation: '魔法系別',
  primary: '主屬性',
  efficacy: '功效類別',
  chakra: '脈輪',
  resonance: '共鳴',
  qrHint: '掃描簽署契約',
  footer: '晶刻 Crystomade · 靈魂印記',
  emptyDate: '—',
} as const

const SERIF_FONT = '"LXGW WenKai TC", "Noto Serif TC", "PingFang TC", "Microsoft JhengHei", serif'
const MONO_FONT = '"Cinzel", ui-monospace, "Menlo", monospace'

function formatBirthDate(isoDate: string | null): string {
  if (!isoDate?.trim()) return LABEL.emptyDate
  const parts = isoDate.trim().slice(0, 10).split('-')
  if (parts.length !== 3) return isoDate
  const [y, m, d] = parts
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

function loadImage(
  src: string,
  crossOrigin?: 'anonymous'
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = crossOrigin
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function goldGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number
): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x + width, y)
  g.addColorStop(0, '#faf0d4')
  g.addColorStop(0.3, '#e8c97a')
  g.addColorStop(0.5, '#fff8e8')
  g.addColorStop(0.7, '#c9a84c')
  g.addColorStop(1, '#b8923f')
  return g
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

/** 產生可分享的身分證 PNG（90×65 比例，高解析度） */
export async function buildFulfillmentIdCardImageBlob(
  card: FulfillmentIdCardData
): Promise<Blob> {
  const W = 1080
  const H = 780
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立畫布')

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H)
  bg.addColorStop(0, '#14100c')
  bg.addColorStop(0.4, '#221a12')
  bg.addColorStop(0.7, '#1a1410')
  bg.addColorStop(1, '#100d09')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 外框
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.55)'
  ctx.lineWidth = 4
  roundRect(ctx, 8, 8, W - 16, H - 16, 14)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.28)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 22, 22, W - 44, H - 44, 10)
  ctx.stroke()

  ctx.textBaseline = 'alphabetic'

  // Header
  ctx.textAlign = 'center'
  ctx.font = `600 18px ${MONO_FONT}`
  ctx.fillStyle = goldGradient(ctx, W / 2 - 140, 0, 280)
  const withLetterSpacing = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string
  }
  withLetterSpacing.letterSpacing = '7px'
  ctx.fillText(LABEL.eyebrow, W / 2 + 3, 62)
  withLetterSpacing.letterSpacing = '0px'

  ctx.font = `700 38px ${SERIF_FONT}`
  ctx.fillStyle = goldGradient(ctx, W / 2 - 160, 0, 320)
  withLetterSpacing.letterSpacing = '8px'
  ctx.fillText(LABEL.cardTitle, W / 2 + 4, 116)
  withLetterSpacing.letterSpacing = '0px'

  // Header divider
  const dividerGrad = ctx.createLinearGradient(W / 2 - 110, 0, W / 2 + 110, 0)
  dividerGrad.addColorStop(0, 'transparent')
  dividerGrad.addColorStop(0.5, '#c9a84c')
  dividerGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = dividerGrad
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2 - 110, 138)
  ctx.lineTo(W / 2 + 110, 138)
  ctx.stroke()

  ctx.textAlign = 'left'

  const headlines = resolveSoulCardDisplayHeadlines(card.magic_title, card.product_name)

  // Hero thumbnail
  const thumbX = 52
  const thumbY = 176
  const thumbSize = 150
  const productImg = card.product_image_url
    ? await loadImage(card.product_image_url, 'anonymous')
    : null

  ctx.save()
  roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 8)
  ctx.clip()
  if (productImg) {
    const scale = Math.max(
      thumbSize / productImg.width,
      thumbSize / productImg.height
    )
    const dw = productImg.width * scale
    const dh = productImg.height * scale
    ctx.drawImage(
      productImg,
      thumbX + (thumbSize - dw) / 2,
      thumbY + (thumbSize - dh) / 2,
      dw,
      dh
    )
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize)
    ctx.fillStyle = '#e8c97a'
    ctx.font = `64px ${SERIF_FONT}`
    ctx.textAlign = 'center'
    ctx.fillText('✦', thumbX + thumbSize / 2, thumbY + thumbSize / 2 + 24)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.5)'
  ctx.lineWidth = 2
  roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 8)
  ctx.stroke()

  // Hero text
  const heroTextX = thumbX + thumbSize + 26
  const heroTextMax = 690 - heroTextX
  ctx.font = `700 40px ${SERIF_FONT}`
  ctx.fillStyle = goldGradient(ctx, heroTextX, 0, heroTextMax)
  ctx.fillText(truncate(ctx, headlines.primary, heroTextMax), heroTextX, thumbY + 52)

  if (headlines.secondary) {
    ctx.font = `400 24px ${SERIF_FONT}`
    ctx.fillStyle = 'rgba(240, 230, 208, 0.68)'
    ctx.fillText(
      truncate(ctx, headlines.secondary, heroTextMax),
      heroTextX,
      thumbY + 92
    )
  }

  if (card.selected_size?.trim()) {
    ctx.font = `400 20px ${SERIF_FONT}`
    ctx.fillStyle = 'rgba(212, 184, 116, 0.7)'
    ctx.fillText(
      `尺寸 · ${card.selected_size.trim()}`,
      heroTextX,
      thumbY + (headlines.secondary ? 126 : 92)
    )
  }

  // Info grid
  const gridTop = 380
  const colGap = 356
  const col1 = 52
  const col2 = col1 + colGap
  const rowH = 88

  const drawField = (
    x: number,
    y: number,
    label: string,
    value: string,
    maxWidth: number,
    opts?: { gold?: boolean; mono?: boolean; big?: boolean }
  ) => {
    ctx.font = `600 17px ${MONO_FONT}`
    ctx.fillStyle = 'rgba(212, 184, 116, 0.82)'
    withLetterSpacing.letterSpacing = '2px'
    ctx.fillText(label, x, y)
    withLetterSpacing.letterSpacing = '0px'

    const valueFont = opts?.big ? 30 : 25
    ctx.font = `${opts?.gold ? '700' : '500'} ${valueFont}px ${
      opts?.mono ? MONO_FONT : SERIF_FONT
    }`
    ctx.fillStyle = opts?.gold
      ? goldGradient(ctx, x, 0, maxWidth)
      : '#f2ebe0'
    ctx.fillText(truncate(ctx, value, maxWidth), x, y + 36)
  }

  drawField(col1, gridTop, LABEL.serial, card.serial_number, colGap - 40, {
    mono: true,
  })
  drawField(
    col2,
    gridTop,
    LABEL.birthDate,
    formatBirthDate(card.magic_birth_date),
    colGap - 40
  )
  drawField(
    col1,
    gridTop + rowH,
    LABEL.affiliation,
    card.magic_affiliation,
    colGap - 40
  )
  drawField(col2, gridTop + rowH, LABEL.primary, card.element_primary, colGap - 40, {
    gold: true,
    big: true,
  })
  drawField(
    col1,
    gridTop + rowH * 2,
    LABEL.efficacy,
    formatEfficacyTags(card.product_tags),
    690 - col1
  )

  // Five elements
  const elemY = gridTop + rowH * 3 + 6
  const elemSize = 54
  const elemGap = 14
  const active = new Set(card.five_elements)
  FIVE_ELEMENTS.forEach((el: FiveElement, i: number) => {
    const ex = col1 + i * (elemSize + elemGap)
    const on = active.has(el)
    ctx.beginPath()
    ctx.arc(ex + elemSize / 2, elemY + elemSize / 2, elemSize / 2, 0, Math.PI * 2)
    if (on) {
      ctx.fillStyle = 'rgba(201, 168, 76, 0.16)'
      ctx.fill()
      ctx.strokeStyle = '#d4b874'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#faf0d4'
    } else {
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.28)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = 'rgba(240, 230, 208, 0.32)'
    }
    ctx.font = `600 26px ${SERIF_FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(el, ex + elemSize / 2, elemY + elemSize / 2 + 10)
    ctx.textAlign = 'left'
  })

  // Extra (chakra / resonance)
  const extras = [
    card.chakra ? `${LABEL.chakra} · ${card.chakra}` : '',
    card.resonance_keyword ? `${LABEL.resonance} · ${card.resonance_keyword}` : '',
  ].filter(Boolean)
  if (extras.length > 0) {
    ctx.font = `400 20px ${SERIF_FONT}`
    ctx.fillStyle = 'rgba(240, 230, 208, 0.52)'
    ctx.fillText(
      truncate(ctx, extras.join('  ·  '), 690 - col1),
      col1,
      elemY + elemSize + 40
    )
  }

  // QR block
  if (card.qr_data_url) {
    const qrImg = await loadImage(card.qr_data_url)
    if (qrImg) {
      const qrBoxSize = 240
      const qrX = W - qrBoxSize - 60
      const qrY = 200
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 10)
      ctx.fill()
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)'
      ctx.lineWidth = 2
      roundRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 10)
      ctx.stroke()
      const pad = 16
      ctx.drawImage(qrImg, qrX + pad, qrY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2)

      ctx.font = `500 18px ${SERIF_FONT}`
      ctx.fillStyle = 'rgba(212, 184, 116, 0.75)'
      ctx.textAlign = 'center'
      ctx.fillText(LABEL.qrHint, qrX + qrBoxSize / 2, qrY + qrBoxSize + 34)
      ctx.textAlign = 'left'
    }
  }

  // Footer
  const footerGrad = ctx.createLinearGradient(W / 2 - 240, 0, W / 2 + 240, 0)
  footerGrad.addColorStop(0, 'transparent')
  footerGrad.addColorStop(0.5, 'rgba(201, 168, 76, 0.4)')
  footerGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = footerGrad
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(W / 2 - 240, H - 62)
  ctx.lineTo(W / 2 + 240, H - 62)
  ctx.stroke()

  ctx.font = `500 20px ${SERIF_FONT}`
  ctx.fillStyle = 'rgba(201, 168, 76, 0.72)'
  ctx.textAlign = 'center'
  withLetterSpacing.letterSpacing = '3px'
  ctx.fillText(LABEL.footer, W / 2, H - 34)
  withLetterSpacing.letterSpacing = '0px'
  ctx.textAlign = 'left'

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('圖片產生失敗'))
    }, 'image/png')
  })
}

function idCardFileName(card: FulfillmentIdCardData): string {
  const headlines = resolveSoulCardDisplayHeadlines(card.magic_title, card.product_name)
  const base = (headlines.primary || card.serial_number || '身分證')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
  return `${base}-${card.serial_number}.png`
}

/** 儲存或分享身分證圖片：支援 Web Share（行動裝置），否則下載 */
export async function shareOrDownloadFulfillmentIdCard(
  card: FulfillmentIdCardData
): Promise<'shared' | 'downloaded'> {
  const blob = await buildFulfillmentIdCardImageBlob(card)
  const fileName = idCardFileName(card)
  const file = new File([blob], fileName, { type: 'image/png' })

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean
    share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>
  }

  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: '水晶魔法身分證' })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared'
      }
      // 分享失敗則退回下載
    }
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
