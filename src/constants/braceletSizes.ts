import type { ProductCategory } from '../lib/types'

/** 手串可選淨手圍（cm） */
export const BRACELET_SIZES_CM = [
  '14',
  '14.5',
  '15',
  '15.5',
  '16',
  '16.5',
  '17',
] as const

export type BraceletSizeCm = (typeof BRACELET_SIZES_CM)[number]

/** 手圍尚未確定（存入購物車／訂單的快照值） */
export const BRACELET_SIZE_UNDECIDED = 'undecided'

/** 是否需選擇手圍（手串品類） */
export function productRequiresBraceletSize(category: ProductCategory): boolean {
  return category === '手串'
}

/** 購物車列唯一識別：同款不同手圍／不同配置為不同列 */
export function buildCartItemKey(
  productId: string,
  selectedSize: string | null | undefined,
  configFingerprint?: string | null
): string {
  const size = selectedSize?.trim()
  const config = configFingerprint?.trim()
  let key = productId
  if (size) key = `${key}_${size}`
  if (config) key = `${key}_cfg_${config}`
  return key
}

/** 規格標籤文案，例如「規格：淨手圍 15cm」 */
export function formatBraceletSizeLabel(selectedSize: string): string {
  const raw = selectedSize.trim()
  if (!raw) return ''
  if (raw === BRACELET_SIZE_UNDECIDED) return '規格：手圍還不確定'
  const withUnit = raw.endsWith('cm') ? raw : `${raw}cm`
  return `規格：淨手圍 ${withUnit}`
}

/** LINE／後台明細單行：商品名（含規格）x 數量 */
export function formatOrderLineItemDetail(item: {
  productName: string
  quantity: number
  selectedSize?: string | null
  braceletConfigSummary?: string | null
}): string {
  const sizePart = item.selectedSize
    ? `（${formatBraceletSizeLabel(item.selectedSize)}）`
    : ''
  const configPart = item.braceletConfigSummary?.trim()
    ? `（${item.braceletConfigSummary.trim()}）`
    : ''
  return `${item.productName}${sizePart}${configPart} x ${item.quantity}`
}
