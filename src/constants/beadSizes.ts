/** 珠材咪數區間（複選；前台依此顯示不同圓徑） */
export const BEAD_SIZE_CATEGORIES = ['4-6', '7-9', '10-12', '13+'] as const

export type BeadSizeCategory = (typeof BEAD_SIZE_CATEGORIES)[number]

export const BEAD_SIZE_LABELS: Record<BeadSizeCategory, string> = {
  '4-6': '4–6mm',
  '7-9': '7–9mm',
  '10-12': '10–12mm',
  '13+': '13mm以上',
}

/** 各咪數區間代表直徑（mm），用於估算串長 */
export const BEAD_SIZE_MM_MID: Record<BeadSizeCategory, number> = {
  '4-6': 5,
  '7-9': 8,
  '10-12': 11,
  '13+': 14,
}

/** 預覽／列表圓形顯示尺寸（px） */
export const BEAD_SIZE_DISPLAY_PX: Record<BeadSizeCategory, number> = {
  '4-6': 28,
  '7-9': 40,
  '10-12': 52,
  '13+': 64,
}

/** 環狀預覽用略小一檔，避免過擠 */
export const BEAD_SIZE_RING_PX: Record<BeadSizeCategory, number> = {
  '4-6': 24,
  '7-9': 34,
  '10-12': 44,
  '13+': 54,
}

const VALID = new Set<string>(BEAD_SIZE_CATEGORIES)

export function isBeadSizeCategory(value: string): value is BeadSizeCategory {
  return VALID.has(value)
}

/** 過濾並依固定區間順序排序 */
export function sanitizeBeadSizes(values: string[]): BeadSizeCategory[] {
  const picked = new Set<BeadSizeCategory>()
  for (const value of values) {
    const trimmed = value.trim()
    if (isBeadSizeCategory(trimmed)) picked.add(trimmed)
  }
  return BEAD_SIZE_CATEGORIES.filter((size) => picked.has(size))
}

export function formatBeadSizes(sizes: BeadSizeCategory[]): string {
  const cleaned = sanitizeBeadSizes(sizes)
  if (cleaned.length === 0) return '—'
  return cleaned.map((s) => BEAD_SIZE_LABELS[s]).join('、')
}

/** 舊資料／未填咪數時預設中檔 */
export function defaultBeadSizes(
  sizes: BeadSizeCategory[] | null | undefined
): BeadSizeCategory[] {
  const cleaned = sanitizeBeadSizes(sizes ?? [])
  return cleaned.length > 0 ? cleaned : ['7-9']
}

export function resolveBeadDisplaySize(
  size: BeadSizeCategory | string | null | undefined
): BeadSizeCategory {
  if (size && isBeadSizeCategory(size)) return size
  return '7-9'
}
