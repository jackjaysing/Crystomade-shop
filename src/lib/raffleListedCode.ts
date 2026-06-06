/** 上架日 YYYYMMDD（依本地時區） */
export function raffleDayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '00000000'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** 依全站抽獎建立時間，產生 YYYYMMDD-序號（同日 01、02…） */
export function buildRaffleListedCodes(
  rows: Array<{ id: string; created_at: string }>
): Map<string, string> {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const dayCount = new Map<string, number>()
  const result = new Map<string, string>()

  for (const row of sorted) {
    const day = raffleDayKey(row.created_at)
    const next = (dayCount.get(day) ?? 0) + 1
    dayCount.set(day, next)
    result.set(row.id, `${day}-${String(next).padStart(2, '0')}`)
  }

  return result
}

/** 預覽下一筆抽獎的上架編號（新增表單用） */
export function getNextRaffleListedCode(
  existing: Array<{ id: string; created_at: string }>
): string {
  const today = raffleDayKey(new Date().toISOString())
  const codes = buildRaffleListedCodes(existing)
  let maxSeq = 0

  for (const code of codes.values()) {
    if (!code.startsWith(`${today}-`)) continue
    const seq = Number.parseInt(code.split('-')[1] ?? '0', 10)
    if (seq > maxSeq) maxSeq = seq
  }

  return `${today}-${String(maxSeq + 1).padStart(2, '0')}`
}
