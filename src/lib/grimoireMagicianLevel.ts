import {

  GRIMOIRE_ASCENDANT_COLLECTION_GOAL,

  GRIMOIRE_BUYER_XP_PER_CARD,

  MAGICIAN_LEVELS,

  MAGICIAN_STARS_PER_LEVEL,

  magicStatusTier,

  type MagicianLevelDef,

} from '../constants/grimoire'

import type { CrystalSoulCard } from './types'



export type MagicianStar = 1 | 2 | 3



export interface MagicianLevelStats {

  bookCount: number

  signedCount: number

  ascendantCount: number

  averageEnergy: number

  meritXp: number

  purchaseMeritCardCount: number

}



export interface MagicianLevelProgress {

  level: MagicianLevelDef

  stars: MagicianStar

  starLabel: string

  nextLevel: MagicianLevelDef | null

  totalXp: number

  cardXp: number

  ownerCultivationXp: number

  purchaseXp: number

  meritXp: number

  xpIntoLevel: number

  xpForNextLevel: number

  progressPercent: number

  xpIntoStar: number

  xpForNextStar: number

  starProgressPercent: number

  stats: MagicianLevelStats

  estimatedNextBookXp: number

  xpToLegend: number

}



/** 下單購入修為（每本固定；轉贈後仍計入下單人） */

export function soulCardBuyerXp(): number {

  return GRIMOIRE_BUYER_XP_PER_CARD

}



/** 當前擁有者的修行里程碑修為（須已簽約；簽約、能量、晉升、任務紀錄等） */

export function soulCardOwnerCultivationXp(card: CrystalSoulCard): number {

  if (!card.contract_signed_at) return 0



  let xp = 30

  xp += Math.floor(card.energy_level * 0.4)



  const statusTier = magicStatusTier(card.magic_status)

  if (statusTier >= 2) xp += 25

  if (statusTier >= 3) xp += 35

  if (statusTier >= 4) xp += 45

  if (statusTier >= 5) xp += 55



  if (card.last_purify_at) xp += 8

  if (card.last_moon_charge_at) xp += 8

  if (card.last_meditation_at) xp += 12

  if (card.is_public) xp += 10



  return xp

}



/** @deprecated 請改用 soulCardBuyerXp + soulCardOwnerCultivationXp */

export function soulCardMagicianXp(card: CrystalSoulCard): number {

  return soulCardBuyerXp() + soulCardOwnerCultivationXp(card)

}



function estimateAscendantOwnerCultivationXp(): number {

  return 30 + 40 + 25 + 35 + 45 + 55 + 8 + 8 + 12 + 10

}



/** 極境滿級單卡的預估修為（下單購入 + 修行） */

export function estimateAscendantSoulCardXp(): number {

  return GRIMOIRE_BUYER_XP_PER_CARD + estimateAscendantOwnerCultivationXp()

}



function resolveMagicianLevel(totalXp: number): {

  level: MagicianLevelDef

  nextLevel: MagicianLevelDef | null

} {

  let level: MagicianLevelDef = MAGICIAN_LEVELS[0]

  for (const candidate of MAGICIAN_LEVELS) {

    if (totalXp >= candidate.minXp) level = candidate

  }



  const levelIndex = MAGICIAN_LEVELS.findIndex((item) => item.tier === level.tier)

  const nextLevel =

    levelIndex >= 0 && levelIndex < MAGICIAN_LEVELS.length - 1

      ? MAGICIAN_LEVELS[levelIndex + 1]

      : null



  return { level, nextLevel }

}



/** 將等級區間均分為三星邊界（整數 XP，餘數補在前幾星） */

function magicianStarBoundaries(levelStart: number, levelEnd: number): number[] {

  const span = levelEnd - levelStart

  if (span <= 0) return [levelStart, levelStart, levelStart, levelStart]



  const base = Math.floor(span / MAGICIAN_STARS_PER_LEVEL)

  const remainder = span % MAGICIAN_STARS_PER_LEVEL

  const bounds = [levelStart]



  for (let i = 0; i < MAGICIAN_STARS_PER_LEVEL; i++) {

    bounds.push(bounds[i] + base + (i < remainder ? 1 : 0))

  }



  return bounds

}



function resolveMagicianStars(

  totalXp: number,

  levelStart: number,

  levelEnd: number

): MagicianStar {

  const bounds = magicianStarBoundaries(levelStart, levelEnd)

  if (totalXp < bounds[1]) return 1

  if (totalXp < bounds[2]) return 2

  return 3

}



export function computeMagicianLevelProgress(

  ownedCards: CrystalSoulCard[],

  meritXp = 0,

  purchaseMeritCardCount = 0

): MagicianLevelProgress {

  const ownerCultivationXp = ownedCards.reduce(

    (sum, card) => sum + soulCardOwnerCultivationXp(card),

    0

  )

  const purchaseXp = Math.max(0, purchaseMeritCardCount) * soulCardBuyerXp()

  const cardXp = ownerCultivationXp + purchaseXp

  const totalXp = cardXp + Math.max(0, meritXp)

  const { level, nextLevel } = resolveMagicianLevel(totalXp)

  const legendXp = MAGICIAN_LEVELS[MAGICIAN_LEVELS.length - 1].minXp



  const levelStart = level.minXp

  const levelEnd = nextLevel?.minXp ?? levelStart

  const levelSpan = Math.max(levelEnd - levelStart, 1)

  const xpIntoLevel = totalXp - levelStart

  const xpForNextLevel = nextLevel ? levelSpan : xpIntoLevel



  const stars = nextLevel

    ? resolveMagicianStars(totalXp, levelStart, levelEnd)

    : (MAGICIAN_STARS_PER_LEVEL as MagicianStar)



  const starBounds = magicianStarBoundaries(levelStart, levelEnd)

  const starStart = starBounds[stars - 1]

  const starEnd = nextLevel ? starBounds[stars] : starBounds[MAGICIAN_STARS_PER_LEVEL]

  const starSpan = Math.max(starEnd - starStart, 1)

  const xpIntoStar = Math.max(0, totalXp - starStart)

  const xpForNextStar = nextLevel ? starSpan : xpIntoStar



  const progressPercent = nextLevel

    ? Math.min(100, Math.round((xpIntoLevel / levelSpan) * 100))

    : 100



  const starProgressPercent = nextLevel

    ? Math.min(100, Math.round((xpIntoStar / starSpan) * 100))

    : 100



  const signedCount = ownedCards.filter((card) => card.contract_signed_at).length

  const ascendantCount = ownedCards.filter((card) => card.magic_status === 'ascendant').length

  const averageEnergy =

    ownedCards.length > 0

      ? Math.round(

          ownedCards.reduce((sum, card) => sum + card.energy_level, 0) / ownedCards.length

        )

      : 0



  const starLabels = ['一星', '二星', '三星'] as const

  const estimatedNextBookXp = estimateAscendantSoulCardXp()



  return {

    level,

    stars,

    starLabel: starLabels[stars - 1],

    nextLevel,

    totalXp,

    cardXp,

    ownerCultivationXp,

    purchaseXp,

    meritXp: Math.max(0, meritXp),

    xpIntoLevel,

    xpForNextLevel,

    progressPercent,

    xpIntoStar,

    xpForNextStar,

    starProgressPercent,

    estimatedNextBookXp,

    xpToLegend: Math.max(0, legendXp - totalXp),

    stats: {

      bookCount: ownedCards.length,

      signedCount,

      ascendantCount,

      averageEnergy,

      meritXp: Math.max(0, meritXp),

      purchaseMeritCardCount: Math.max(0, purchaseMeritCardCount),

    },

  }

}



export function formatMagicianCollectionHint(progress: MagicianLevelProgress): string | null {

  if (progress.stats.bookCount === 0 && progress.stats.purchaseMeritCardCount === 0) {

    return null

  }



  if (!progress.nextLevel) {

    return `極境典藏 ${progress.stats.ascendantCount} 本 · 日常修行修為 +${progress.meritXp}`

  }



  if (progress.xpToLegend > 0 && progress.xpToLegend <= progress.estimatedNextBookXp) {

    return `再收藏一本並練至極境，有機會晉升「${MAGICIAN_LEVELS[MAGICIAN_LEVELS.length - 1].title}」`

  }



  if (progress.stats.ascendantCount < GRIMOIRE_ASCENDANT_COLLECTION_GOAL) {

    return `極境典藏 ${progress.stats.ascendantCount}/${GRIMOIRE_ASCENDANT_COLLECTION_GOAL} · 再一本預估 +${progress.estimatedNextBookXp} 修為`

  }



  return `再收藏一本滿級魔導書，預估 +${progress.estimatedNextBookXp} 巫師修為`

}


