/** 該等級起享有的完整典藏禮遇 */
export function magicianLevelCumulativePerks(tier: number): string[] {
  const cells = magicianLevelPerkCells(tier)
  const perks = [`雪白能量遠端加持 · ${cells.blessing}`]
  if (cells.birthday) {
    perks.push(`生日月${cells.birthday}`)
  }
  if (cells.shipping) {
    perks.push(`免運 · ${cells.shipping}`)
  }
  return perks
}

/** 表格用：各等級禮遇欄位（累積享有） */
export function magicianLevelPerkCells(tier: number): {
  blessing: string
  birthday: string | null
  shipping: string | null
} {
  if (tier < 1) {
    return { blessing: '—', birthday: null, shipping: null }
  }

  let blessing = '每年 1 次'
  if (tier >= 7) blessing = '每月 1 次'
  else if (tier >= 6) blessing = '每 2 個月 1 次'
  else if (tier >= 5) blessing = '每季 1 次'
  else if (tier >= 4) blessing = '每半年 1 次'

  const birthday = tier >= 2 ? (tier >= 7 ? '精選小禮' : '隨機小禮') : null
  const shipping =
    tier === 7 ? '每月 2 次' : tier === 6 ? '每月 1 次' : tier === 5 ? '每季 1 次' : null

  return { blessing, birthday, shipping }
}

/** 該階新解鎖的禮遇（內部對照用） */
export function magicianLevelNewPerks(tier: number): string[] {
  if (tier === 1) return ['雪白能量遠端加持 · 每年 1 次']
  if (tier === 2) return ['生日月隨機小禮']
  if (tier === 3) return []
  if (tier === 4) return ['雪白能量遠端加持 · 每半年 1 次']
  if (tier === 5) return ['雪白能量遠端加持 · 每季 1 次', '免運 · 每季 1 次']
  if (tier === 6) return ['雪白能量遠端加持 · 每 2 個月 1 次', '免運 · 每月 1 次']
  if (tier === 7) {
    return ['雪白能量遠端加持 · 每月 1 次', '生日月精選小禮', '免運 · 每月 2 次']
  }
  return []
}
