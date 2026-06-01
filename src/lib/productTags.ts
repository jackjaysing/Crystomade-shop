import { CRYSTAL_COLOR_TAGS } from '../constants/crystalColors'
import { EFFICACY_TAGS } from '../constants/tags'

/** 後台可勾選、前台可顯示的標籤（功效 + 水晶色） */
export const ALLOWED_PRODUCT_TAGS: readonly string[] = [
  ...EFFICACY_TAGS,
  ...CRYSTAL_COLOR_TAGS,
]

const allowedTagSet = new Set<string>(ALLOWED_PRODUCT_TAGS)

/** 移除舊版材質標籤（如粉晶、黃水晶），只保留後台可勾選項目 */
export function sanitizeProductTags(tags: string[]): string[] {
  return tags.filter((tag) => allowedTagSet.has(tag))
}
