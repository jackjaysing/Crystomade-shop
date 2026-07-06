import { MAGICIAN_LEVELS } from '../constants/grimoire'
import { magicianLevelPerkCells } from './grimoireMagicianPerks'
import { groupSoulCardsByUser, summarizeMemberMagician } from './adminMemberMagician'
import type { AdminRegisteredCustomer, CrystalSoulCard } from './types'

export interface BirthdayMemberRow {
  member: AdminRegisteredCustomer
  birthdayMonth: number
  birthdayDay: number
  magicianTitle: string
  magicianTier: number
  totalXp: number
  giftEligible: boolean
  giftType: string | null
}

export function parseBirthdayParts(birthday: string): { month: number; day: number } | null {
  const parts = birthday.slice(0, 10).split('-')
  if (parts.length !== 3) return null
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  return { month, day }
}

export function formatBirthdayLabel(birthday: string): string {
  const parts = parseBirthdayParts(birthday)
  if (!parts) return birthday || '—'
  return `${parts.month} 月 ${parts.day} 日`
}

/** 符文學徒（II）以上享生日月小禮 */
export const BIRTHDAY_GIFT_MIN_MAGICIAN_TIER = 2

export function buildBirthdayMemberRows(
  members: AdminRegisteredCustomer[],
  soulCards: CrystalSoulCard[],
  month: number,
  purchaseMeritByUser?: Map<string, number>
): BirthdayMemberRow[] {
  const cardsByUser = groupSoulCardsByUser(soulCards)

  const rows: BirthdayMemberRow[] = []

  for (const member of members) {
    const parts = parseBirthdayParts(member.birthday)
    if (!parts || parts.month !== month) continue

    const progress = summarizeMemberMagician(
      member,
      cardsByUser,
      soulCards,
      purchaseMeritByUser
    )

    const giftEligible = progress.tier >= BIRTHDAY_GIFT_MIN_MAGICIAN_TIER
    const giftType = giftEligible ? magicianLevelPerkCells(progress.tier).birthday : null

    rows.push({
      member,
      birthdayMonth: parts.month,
      birthdayDay: parts.day,
      magicianTitle: progress.title,
      magicianTier: progress.tier,
      totalXp: progress.totalXp,
      giftEligible,
      giftType,
    })
  }

  return rows.sort((a, b) => {
    if (a.birthdayDay !== b.birthdayDay) return a.birthdayDay - b.birthdayDay
    return a.member.real_name.localeCompare(b.member.real_name, 'zh-Hant')
  })
}

export function birthdayMembersExportText(rows: BirthdayMemberRow[]): string {
  const header = '日期\t姓名\t電話\t生日\t魔法師等級\t修為\t生日禮\t禮物種類'
  const lines = rows.map((row) => {
    const gift = row.giftEligible ? '符合' : '未達'
    const giftType = row.giftType ?? '—'
    return `${row.birthdayMonth}/${row.birthdayDay}\t${row.member.real_name}\t${row.member.phone}\t${row.member.birthday}\t${row.magicianTitle}\t${row.totalXp}\t${gift}\t${giftType}`
  })
  return [header, ...lines].join('\n')
}

export function monthLabel(year: number, month: number): string {
  return `${year} 年 ${month} 月`
}

export function defaultBirthdayMonthValue(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function parseMonthInput(value: string): { year: number; month: number } {
  const [y, m] = value.split('-')
  return {
    year: Number(y) || new Date().getFullYear(),
    month: Number(m) || new Date().getMonth() + 1,
  }
}

export function birthdayGiftTierLabel(): string {
  const level = MAGICIAN_LEVELS.find((item) => item.tier === BIRTHDAY_GIFT_MIN_MAGICIAN_TIER)
  return level ? `${level.title}（Lv.${level.tier}）` : '符文學徒'
}
