/** 文章網址 slug（標題 + id 前綴，避免中文重複） */
export function buildArticleSlug(title: string, id: string): string {
  const namePart = String(title || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\/\\?#&%+]+/g, '')
    .slice(0, 60)

  const idPart = id.replace(/-/g, '').slice(0, 8)
  if (namePart && idPart) return `${namePart}-${idPart}`
  return idPart || 'article'
}

export function articleDetailPath(slug: string): string {
  return `/academy/${encodeURIComponent(slug)}`
}
