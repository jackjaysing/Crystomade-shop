import { COUPON_TYPE_LABELS } from '../constants/coupons'
import { sanitizeFiveElements } from './fiveElements'
import { sanitizeSubcategoryForSave } from './productSubcategory'
import { sanitizeProductTags } from './productTags'
import {
  calcSalePrice,
  formatDiscountZheLabel,
  parseDiscountZhe,
} from './productPricing'
import type {
  AnnouncementBanner,
  Coupon,
  CouponFormData,
  GiftCouponFormData,
  PointProduct,
  Product,
  ProductEditData,
  ProductGalleryEditItem,
  Raffle,
  RaffleFormData,
} from './types'

export function formatAdminMoney(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`
}

export function formatAdminDiscount(value: number | null | undefined): string {
  if (value == null) return '無折扣'
  return formatDiscountZheLabel(value)
}

export function formatAdminBool(
  value: boolean,
  trueLabel = '是',
  falseLabel = '否'
): string {
  return value ? trueLabel : falseLabel
}

export function formatAdminList(values: string[]): string {
  return values.length > 0 ? values.join('、') : '（無）'
}

function pushTextChange(
  changes: string[],
  label: string,
  before: string,
  after: string
): void {
  if (before !== after) changes.push(`${label}：${before} → ${after}`)
}

function pushNumberChange(
  changes: string[],
  label: string,
  before: number,
  after: number,
  format: (value: number) => string = String
): void {
  if (before !== after) changes.push(`${label}：${format(before)} → ${format(after)}`)
}

function pushArrayChange(
  changes: string[],
  label: string,
  before: string[],
  after: string[]
): void {
  const prev = formatAdminList([...before].sort())
  const next = formatAdminList([...after].sort())
  if (prev !== next) changes.push(`${label}：${prev} → ${next}`)
}

export function joinAdminChangeSummary(
  changes: string[],
  entityLabel: string,
  prefix = '更新'
): string {
  if (changes.length === 0) return `${prefix}${entityLabel}（無欄位變更）`
  return `${prefix}${entityLabel}：${changes.join('；')}`
}

/** 將日誌摘要拆成標題與變更明細，供後台日誌 UI 顯示 */
export function parseAdminLogSummary(summary: string): {
  headline: string
  changes: string[]
} {
  const splitAt = summary.indexOf('：')
  if (splitAt === -1) {
    return { headline: summary, changes: [] }
  }

  const headline = summary.slice(0, splitAt).trim()
  const body = summary.slice(splitAt + 1).trim()
  if (!body) return { headline: summary, changes: [] }

  if (body.includes('→') || body.includes('；')) {
    return {
      headline,
      changes: body
        .split('；')
        .map((part) => part.trim())
        .filter(Boolean),
    }
  }

  return { headline, changes: [body] }
}

export function isProductGalleryChanged(
  beforeUrls: string[],
  items: ProductGalleryEditItem[]
): boolean {
  if (beforeUrls.length !== items.length) return true
  return items.some((item, index) => {
    if (item.kind === 'new') return true
    return item.url !== beforeUrls[index]
  })
}

export function buildProductUpdateSummary(
  before: Product,
  form: ProductEditData
): string {
  const changes: string[] = []
  const afterName = form.name.trim()
  const name = afterName || before.name
  const nextStock = Math.max(0, Math.floor(form.stock))
  const afterCategory = form.category
  const afterTags = sanitizeProductTags(form.tags)
  const afterFive = sanitizeFiveElements(form.five_elements)
  const afterSubcategory =
    sanitizeSubcategoryForSave(afterCategory, form.subcategory) ?? '—'
  const beforeSubcategory = before.subcategory ?? '—'
  const beforeDiscountZhe = parseDiscountZhe(before.discount_zhe)
  const afterDiscountZhe = parseDiscountZhe(form.discount_zhe)

  pushTextChange(changes, '名稱', before.name, afterName)
  pushTextChange(changes, '品類', before.category, afterCategory)

  const beforeBracelet =
    before.category === '手串' ? before.bracelet_style ?? '通用' : '—'
  const afterBracelet =
    afterCategory === '手串' ? form.bracelet_style ?? '通用' : '—'
  pushTextChange(changes, '手串款式', beforeBracelet, afterBracelet)

  pushTextChange(changes, '細項分類', beforeSubcategory, afterSubcategory)

  pushNumberChange(
    changes,
    '原價',
    Math.round(before.price),
    Math.round(form.price),
    formatAdminMoney
  )

  pushTextChange(
    changes,
    '折扣',
    formatAdminDiscount(beforeDiscountZhe),
    formatAdminDiscount(afterDiscountZhe)
  )

  const beforeSale = calcSalePrice(before.price, beforeDiscountZhe)
  const afterSale = calcSalePrice(form.price, afterDiscountZhe)
  pushNumberChange(changes, '特價', beforeSale, afterSale, formatAdminMoney)

  pushNumberChange(changes, '庫存', before.stock, nextStock, (value) => `${value} 件`)

  if (before.description.trim() !== form.description.trim()) {
    changes.push('商品介紹已更新')
  }

  pushArrayChange(changes, '標籤', before.tags, afterTags)
  pushArrayChange(changes, '五行', before.five_elements, afterFive)

  if (before.is_hot !== form.is_hot) {
    pushTextChange(
      changes,
      '熱門商品',
      formatAdminBool(before.is_hot),
      formatAdminBool(form.is_hot)
    )
  }

  if (before.is_quick_add !== form.is_quick_add) {
    pushTextChange(
      changes,
      '快捷加購',
      formatAdminBool(before.is_quick_add),
      formatAdminBool(form.is_quick_add)
    )
  }

  if (form.coverFile) changes.push('更換封面圖')
  if (isProductGalleryChanged(before.gallery_urls, form.galleryItems)) {
    changes.push('調整相簿圖片')
  }

  return joinAdminChangeSummary(changes, `商品「${name}」`)
}

export function buildPointProductUpdateSummary(
  before: PointProduct,
  patch: Partial<{
    name: string
    required_points: number
    stock: number
    is_active: boolean
    imageFile: File | null
  }>
): string {
  const name = patch.name?.trim() || before.name

  if (patch.is_active != null && patch.is_active !== before.is_active) {
    return `${patch.is_active ? '上架' : '下架'}點數商品「${name}」`
  }

  if (patch.imageFile) return `更換點數商品「${name}」的圖片`

  const changes: string[] = []
  if (patch.name != null) {
    pushTextChange(changes, '名稱', before.name, patch.name.trim())
  }
  if (patch.required_points != null) {
    pushNumberChange(
      changes,
      '所需點數',
      before.required_points,
      Math.max(1, Math.floor(patch.required_points)),
      (value) => `${value} 點`
    )
  }
  if (patch.stock != null) {
    pushNumberChange(
      changes,
      '庫存',
      before.stock,
      Math.max(0, Math.floor(patch.stock)),
      (value) => `${value} 件`
    )
  }

  return joinAdminChangeSummary(changes, `點數商品「${name}」`)
}

export function buildBannerUpdateSummary(
  before: AnnouncementBanner,
  patch: {
    name?: string
    link_url?: string | null
    is_active?: boolean
    imageFile?: File | null
  }
): string {
  const changes: string[] = []
  const name = patch.name?.trim() || before.name

  if ('name' in patch && patch.name != null) {
    pushTextChange(changes, '名稱', before.name, patch.name.trim())
  }
  if ('link_url' in patch) {
    const beforeLink = before.link_url?.trim() || '（無）'
    const afterLink = patch.link_url?.trim() || '（無）'
    pushTextChange(changes, '連結', beforeLink, afterLink)
  }
  if ('is_active' in patch && patch.is_active != null) {
    pushTextChange(
      changes,
      '狀態',
      formatAdminBool(before.is_active, '啟用', '停用'),
      formatAdminBool(patch.is_active, '啟用', '停用')
    )
  }
  if (patch.imageFile) changes.push('更換橫幅圖片')

  return joinAdminChangeSummary(changes, `公告橫幅「${name}」`)
}

function formatCouponType(type: Coupon['coupon_type']): string {
  return COUPON_TYPE_LABELS[type]
}

export function buildCouponUpdateSummary(
  before: Coupon,
  data: CouponFormData
): string {
  const changes: string[] = []

  pushTextChange(changes, '名稱', before.title, data.title.trim())
  if (before.description.trim() !== data.description.trim()) {
    changes.push('說明已更新')
  }
  pushTextChange(
    changes,
    '類型',
    formatCouponType(before.coupon_type),
    formatCouponType(data.coupon_type)
  )
  pushNumberChange(
    changes,
    '滿額門檻',
    before.min_purchase_amount,
    Math.max(0, data.min_purchase_amount),
    formatAdminMoney
  )

  if (data.coupon_type === 'fixed_discount') {
    pushNumberChange(
      changes,
      '折抵金額',
      before.discount_amount ?? 0,
      data.discount_amount ?? 0,
      formatAdminMoney
    )
  }

  if (data.coupon_type === 'percent_discount') {
    pushTextChange(
      changes,
      '折扣',
      formatAdminDiscount(before.discount_zhe),
      formatAdminDiscount(data.discount_zhe)
    )
  }

  if (data.coupon_type === 'gift') {
    const beforeGift = before.gift_description?.trim() || '（無）'
    const afterGift = data.gift_description?.trim() || '（無）'
    pushTextChange(changes, '贈品說明', beforeGift, afterGift)
  }

  pushTextChange(
    changes,
    '狀態',
    formatAdminBool(before.is_active, '啟用', '停用'),
    formatAdminBool(data.is_active, '啟用', '停用')
  )

  const beforeDays = before.valid_days ?? 0
  const afterDays = data.valid_days && data.valid_days > 0 ? data.valid_days : 0
  pushNumberChange(changes, '有效天數', beforeDays, afterDays, (value) =>
    value > 0 ? `${value} 天` : '不限'
  )

  return joinAdminChangeSummary(changes, `優惠券「${data.title.trim() || before.title}」`)
}

export function buildGiftCouponUpdateSummary(
  before: Coupon,
  data: GiftCouponFormData
): string {
  const changes: string[] = []

  pushTextChange(changes, '名稱', before.title, data.title.trim())
  if (before.description.trim() !== data.description.trim()) {
    changes.push('說明已更新')
  }
  pushTextChange(
    changes,
    '禮物內容',
    before.gift_description?.trim() || '（無）',
    data.gift_description.trim() || '（無）'
  )
  pushTextChange(
    changes,
    '狀態',
    formatAdminBool(before.is_active, '啟用', '停用'),
    formatAdminBool(data.is_active, '啟用', '停用')
  )

  const beforeDays = before.valid_days ?? 0
  const afterDays = data.valid_days && data.valid_days > 0 ? data.valid_days : 0
  pushNumberChange(changes, '有效天數', beforeDays, afterDays, (value) =>
    value > 0 ? `${value} 天` : '不限'
  )

  if (data.image_url !== before.image_url) changes.push('更換禮物圖片')

  return joinAdminChangeSummary(changes, `禮物券「${data.title.trim() || before.title}」`)
}

function formatRaffleDeadline(value: string): string {
  if (!value) return '（未設定）'
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function buildRaffleUpdateSummary(
  before: Raffle,
  data: RaffleFormData
): string {
  const changes: string[] = []
  const beforePrize = before.prize_title?.trim() || before.title.trim()
  const afterPrize = data.prize_title.trim()

  pushTextChange(changes, '獎品名稱', beforePrize, afterPrize)
  if (before.description.trim() !== data.description.trim()) {
    changes.push('活動說明已更新')
  }
  pushTextChange(
    changes,
    '報名截止',
    formatRaffleDeadline(before.registration_deadline),
    formatRaffleDeadline(data.registration_deadline)
  )
  pushTextChange(
    changes,
    '狀態',
    formatAdminBool(before.is_active, '啟用', '停用'),
    formatAdminBool(data.is_active, '啟用', '停用')
  )
  if (data.prize_image_url !== before.prize_image_url) {
    changes.push('更換獎品圖片')
  }

  return joinAdminChangeSummary(changes, `抽獎「${afterPrize || beforePrize}」`)
}
