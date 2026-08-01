import type { StudioLocation } from '../lib/types'

export interface StudioLocationOption {
  id: StudioLocation
  label: string
  /** 圖表／徽章用短名 */
  shortLabel: string
}

/** 分潤歸屬人選（分潤統計） */
export const STUDIO_LOCATIONS: StudioLocationOption[] = [
  { id: '羽薇', label: '羽薇', shortLabel: '羽薇' },
  { id: 'Ken', label: 'Ken', shortLabel: 'Ken' },
  { id: 'Johnman', label: 'Johnman', shortLabel: 'Johnman' },
]

/** 分潤比例（淨利潤 3 成） */
export const STUDIO_PROFIT_SHARE_RATE = 0.3

const VALID_STUDIOS = new Set<string>(STUDIO_LOCATIONS.map((s) => s.id))

export function parseStudioLocation(value: unknown): StudioLocation | null {
  if (value == null) return null
  const s = String(value)
  return VALID_STUDIOS.has(s) ? (s as StudioLocation) : null
}

export function getStudioLocationLabel(
  studio: StudioLocation | null | undefined
): string {
  if (!studio) return '未指定'
  return STUDIO_LOCATIONS.find((s) => s.id === studio)?.label ?? studio
}

/** 分潤金額（四捨五入至整數；淨利潤為負時不分潤） */
export function calcStudioShareAmount(netProfit: number): number {
  if (netProfit <= 0) return 0
  return Math.round(netProfit * STUDIO_PROFIT_SHARE_RATE)
}
