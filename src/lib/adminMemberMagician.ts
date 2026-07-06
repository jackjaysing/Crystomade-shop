import { computeMagicianLevelProgress } from './grimoireMagicianLevel'
import type { AdminRegisteredCustomer, CrystalSoulCard } from './types'

export interface MemberMagicianSummary {
  title: string
  tier: number
  starLabel: string
  totalXp: number
  purchaseXp: number
  ownerCultivationXp: number
  meritXp: number
  bookCount: number
  signedBookCount: number
  pendingContractCount: number
  purchaseMeritCardCount: number
}

export function groupSoulCardsByUser(
  soulCards: CrystalSoulCard[]
): Map<string, CrystalSoulCard[]> {
  const cardsByUser = new Map<string, CrystalSoulCard[]>()
  for (const card of soulCards) {
    const list = cardsByUser.get(card.user_id) ?? []
    list.push(card)
    cardsByUser.set(card.user_id, list)
  }
  return cardsByUser
}

export function countPurchaseMeritCards(
  memberId: string,
  soulCards: CrystalSoulCard[]
): number {
  return soulCards.filter((card) => card.purchased_by_user_id === memberId).length
}

/** 依靈魂卡快照彙總各會員購入本數（下單人） */
export function buildPurchaseMeritCountByUser(
  soulCards: CrystalSoulCard[]
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const card of soulCards) {
    if (!card.purchased_by_user_id) continue
    const buyerId = card.purchased_by_user_id
    counts.set(buyerId, (counts.get(buyerId) ?? 0) + 1)
  }
  return counts
}

export function resolvePurchaseMeritByUser(
  fromRpc: Map<string, number>,
  fromCards: CrystalSoulCard[]
): Map<string, number> {
  if (fromRpc.size > 0) return fromRpc
  return buildPurchaseMeritCountByUser(fromCards)
}

/** 後台：單一會員魔法師等級與修為 */
export function summarizeMemberMagician(
  member: Pick<AdminRegisteredCustomer, 'id' | 'grimoire_merit_xp'>,
  cardsByUser: Map<string, CrystalSoulCard[]>,
  soulCards: CrystalSoulCard[],
  purchaseMeritByUser?: Map<string, number>
): MemberMagicianSummary {
  const owned = cardsByUser.get(member.id) ?? []
  const purchaseMeritCardCount =
    purchaseMeritByUser?.get(member.id) ??
    countPurchaseMeritCards(member.id, soulCards)
  const progress = computeMagicianLevelProgress(
    owned,
    member.grimoire_merit_xp,
    purchaseMeritCardCount
  )

  return {
    title: progress.level.title,
    tier: progress.level.tier,
    starLabel: progress.starLabel,
    totalXp: progress.totalXp,
    purchaseXp: progress.purchaseXp,
    ownerCultivationXp: progress.ownerCultivationXp,
    meritXp: progress.meritXp,
    bookCount: progress.stats.bookCount,
    signedBookCount: progress.stats.signedCount,
    pendingContractCount: owned.filter((card) => !card.contract_signed_at).length,
    purchaseMeritCardCount,
  }
}

/** 後台：魔導書本數標籤（未簽約不算「持有」） */
export function formatMemberMagicianBookSummary(summary: MemberMagicianSummary): string {
  const parts: string[] = []
  if (summary.purchaseMeritCardCount > 0) {
    parts.push(`購入 ${summary.purchaseMeritCardCount} 本`)
  }
  if (summary.signedBookCount > 0) {
    parts.push(`已簽約 ${summary.signedBookCount} 本`)
  } else if (summary.pendingContractCount > 0) {
    parts.push(`待簽約 ${summary.pendingContractCount} 本`)
  }
  return parts.join(' · ')
}

export function formatMemberMagicianXpBreakdown(summary: MemberMagicianSummary): string {
  const parts: string[] = []
  if (summary.purchaseXp > 0) {
    parts.push(`購入+${summary.purchaseXp}`)
  }
  if (summary.ownerCultivationXp > 0) {
    parts.push(`修行+${summary.ownerCultivationXp}`)
  }
  if (summary.meritXp > 0) {
    parts.push(`日常+${summary.meritXp}`)
  }
  return parts.join(' · ')
}

export function formatMemberMagicianLabel(summary: MemberMagicianSummary): string {
  return `${summary.title} · ${summary.starLabel}`
}
