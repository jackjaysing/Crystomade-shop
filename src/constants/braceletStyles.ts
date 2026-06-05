import type { BraceletStyle } from '../lib/types'

export interface BraceletStyleOption {
  id: BraceletStyle
  label: string
}

/** 手串款式 */
export const BRACELET_STYLES: BraceletStyleOption[] = [
  { id: '通用', label: '通用款' },
  { id: '男款', label: '男款' },
  { id: '女款', label: '女款' },
  { id: '兒童款', label: '兒童款' },
]

const VALID_STYLES = new Set<string>(BRACELET_STYLES.map((s) => s.id))

export function parseBraceletStyle(value: unknown): BraceletStyle | null {
  const s = String(value ?? '')
  return VALID_STYLES.has(s) ? (s as BraceletStyle) : null
}

export function getBraceletStyleLabel(style: BraceletStyle | null | undefined): string {
  if (!style) return ''
  return BRACELET_STYLES.find((s) => s.id === style)?.label ?? style
}

/** 手串商品預設款式 */
export const DEFAULT_BRACELET_STYLE: BraceletStyle = '通用'
