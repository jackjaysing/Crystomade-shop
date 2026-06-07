import { FIVE_ELEMENTS, type FiveElement } from '../constants/fiveElements'

const VALID = new Set<string>(FIVE_ELEMENTS)

/** 過濾並依金木水火土排序 */
export function sanitizeFiveElements(values: string[]): FiveElement[] {
  const picked = new Set<FiveElement>()
  for (const value of values) {
    const trimmed = value.trim()
    if (VALID.has(trimmed)) picked.add(trimmed as FiveElement)
  }
  return FIVE_ELEMENTS.filter((el) => picked.has(el))
}
