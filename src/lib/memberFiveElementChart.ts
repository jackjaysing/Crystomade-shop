import {
  ELEMENT_INTENSITIES,
  FIVE_ELEMENTS,
  type ElementIntensity,
  type FiveElement,
  type MemberFiveElementChart,
  type WeightedElement,
} from '../constants/fiveElements'
import { sanitizeFiveElements } from './fiveElements'

const INTENSITY_SET = new Set<string>(ELEMENT_INTENSITIES)

export const EMPTY_MEMBER_FIVE_ELEMENT_CHART: MemberFiveElementChart = {
  natal: [],
  composite: [],
  balance: [],
  reduce: [],
  note: '',
}

export function isElementIntensity(value: unknown): value is ElementIntensity {
  return typeof value === 'string' && INTENSITY_SET.has(value)
}

function sanitizeWeightedList(raw: unknown): WeightedElement[] {
  if (!Array.isArray(raw)) return []
  const byElement = new Map<FiveElement, ElementIntensity>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const el =
      typeof row.element === 'string' ? row.element.trim() : ''
    if (!FIVE_ELEMENTS.includes(el as FiveElement)) continue
    const intensity = isElementIntensity(row.intensity)
      ? row.intensity
      : '中'
    byElement.set(el as FiveElement, intensity)
  }
  return FIVE_ELEMENTS.filter((el) => byElement.has(el)).map((element) => ({
    element,
    intensity: byElement.get(element) ?? '中',
  }))
}

/** 本命／綜合：最多 3、去重、依金木水火土排序 */
export function sanitizeChartTrio(values: string[]): FiveElement[] {
  return sanitizeFiveElements(values).slice(0, 3)
}

export function deriveMissingElements(
  natal: FiveElement[],
  composite: FiveElement[]
): FiveElement[] {
  const present = new Set<FiveElement>([...natal, ...composite])
  return FIVE_ELEMENTS.filter((el) => !present.has(el))
}

export function parseMemberFiveElementChart(
  raw: unknown
): MemberFiveElementChart | null {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const natal = sanitizeChartTrio(
    Array.isArray(row.natal) ? row.natal.map(String) : []
  )
  const composite = sanitizeChartTrio(
    Array.isArray(row.composite) ? row.composite.map(String) : []
  )
  const balance = sanitizeWeightedList(row.balance)
  const reduce = sanitizeWeightedList(row.reduce)
  const note = typeof row.note === 'string' ? row.note.trim() : ''

  if (
    natal.length === 0 &&
    composite.length === 0 &&
    balance.length === 0 &&
    reduce.length === 0 &&
    !note
  ) {
    return null
  }

  return { natal, composite, balance, reduce, note }
}

export function sanitizeMemberFiveElementChart(
  chart: MemberFiveElementChart
): MemberFiveElementChart | null {
  return parseMemberFiveElementChart(chart)
}

function formatWeightedShort(list: WeightedElement[]): string {
  return list
    .map((item) =>
      item.intensity === '中' ? item.element : `${item.intensity}${item.element}`
    )
    .join('')
}

/** 列表摘要，例：缺水｜平水｜降火土 */
export function formatMemberFiveElementChartSummary(
  chart: MemberFiveElementChart | null | undefined
): string {
  if (!chart) return '—'
  const missing = deriveMissingElements(chart.natal, chart.composite)
  const parts: string[] = []
  if (missing.length > 0) parts.push(`缺${missing.join('')}`)
  if (chart.balance.length > 0) {
    parts.push(`平${formatWeightedShort(chart.balance)}`)
  }
  if (chart.reduce.length > 0) {
    parts.push(`降${formatWeightedShort(chart.reduce)}`)
  }
  if (parts.length === 0 && (chart.natal.length > 0 || chart.composite.length > 0)) {
    const natal = chart.natal.length ? `本${chart.natal.join('')}` : ''
    const composite = chart.composite.length
      ? `綜${chart.composite.join('')}`
      : ''
    return [natal, composite].filter(Boolean).join('｜') || '—'
  }
  return parts.length > 0 ? parts.join('｜') : '—'
}

/** 點選循環：未選 → 中 → 強 → 弱 → 一點點 → 取消 */
export function cycleWeightedElement(
  list: WeightedElement[],
  element: FiveElement
): WeightedElement[] {
  const order: ElementIntensity[] = ['中', '強', '弱', '一點點']
  const existing = list.find((item) => item.element === element)
  if (!existing) {
    return sanitizeWeightedList([...list, { element, intensity: '中' }])
  }
  const idx = order.indexOf(existing.intensity)
  if (idx < 0 || idx >= order.length - 1) {
    return sanitizeWeightedList(list.filter((item) => item.element !== element))
  }
  return sanitizeWeightedList(
    list.map((item) =>
      item.element === element
        ? { element, intensity: order[idx + 1]! }
        : item
    )
  )
}

/** 本命／綜合：已選則取消；未滿 3 則加入 */
export function toggleChartTrio(
  current: FiveElement[],
  element: FiveElement
): FiveElement[] {
  if (current.includes(element)) {
    return sanitizeChartTrio(current.filter((el) => el !== element))
  }
  if (current.length >= 3) return current
  return sanitizeChartTrio([...current, element])
}
