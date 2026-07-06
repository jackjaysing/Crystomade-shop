import { EFFICACY_TAGS } from '../constants/tags'

const efficacySet = new Set<string>(EFFICACY_TAGS)

/** 從商品標籤中取出功效類別 */
export function pickEfficacyTags(tags: string[] | null | undefined): string[] {
  if (!tags?.length) return []
  return tags.filter((tag) => efficacySet.has(tag))
}

/** 功效類別顯示文字 */
export function formatEfficacyTags(tags: string[] | null | undefined): string {
  const picked = pickEfficacyTags(tags)
  return picked.length > 0 ? picked.join(' · ') : '—'
}
