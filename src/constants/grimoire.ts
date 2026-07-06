/** 水晶靈魂卡覺醒狀態（階級） */
export type CrystalMagicStatus = 'dormant' | 'awakening' | 'resonating'

export type GrimoireTaskType = 'purify' | 'moon' | 'meditation'

export const CRYSTAL_MAGIC_STATUS_ORDER: CrystalMagicStatus[] = [
  'dormant',
  'awakening',
  'resonating',
]

export const CRYSTAL_MAGIC_STATUS_LABELS: Record<CrystalMagicStatus, string> = {
  dormant: '沉睡中',
  awakening: '覺醒中',
  resonating: '共鳴穩定',
}

export const CRYSTAL_MAGIC_RANK: Record<
  CrystalMagicStatus,
  {
    tier: number
    roman: string
    title: string
    epithet: string
    flavor: string
  }
> = {
  dormant: {
    tier: 1,
    roman: 'I',
    title: '初印',
    epithet: '沉眠之印',
    flavor: '靈魂印記已烙下，等待契約與覺醒',
  },
  awakening: {
    tier: 2,
    roman: 'II',
    title: '覺醒',
    epithet: '心動之印',
    flavor: '能量開始流動，水晶與你同頻呼吸',
  },
  resonating: {
    tier: 3,
    roman: 'III',
    title: '極境',
    epithet: '永恆共鳴',
    flavor: '光與意念完全交融，身分證綻放極致光華',
  },
}

export function magicStatusTier(status: CrystalMagicStatus): number {
  return CRYSTAL_MAGIC_RANK[status].tier
}

export const CRYSTAL_MAGIC_STATUS_NEXT_LABEL: Partial<
  Record<CrystalMagicStatus, string>
> = {
  dormant: '晉升 · 覺醒階',
  awakening: '晉升 · 極境階',
}

export const ENERGY_CONTRACT_TEXT =
  '我願與此水晶共同成長，並保持心念純淨。以誠意守護這份能量連結，讓光與意圖在彼此之間流動。'

export const ENERGY_CONTRACT_TITLE = '水晶能量契約'

export const GRIMOIRE_TASKS: {
  type: GrimoireTaskType
  label: string
  description: string
  boost: number
  cooldownHours: number
}[] = [
  {
    type: 'purify',
    label: '淨化水晶',
    description: '誠意淨化，不拘形式',
    boost: 10,
    cooldownHours: 24,
  },
  {
    type: 'moon',
    label: '與水晶對話',
    description: '無聲亦可，心意相通',
    boost: 10,
    cooldownHours: 24,
  },
  {
    type: 'meditation',
    label: '靜心冥想',
    description: '同頻呼吸，安定意念',
    boost: 15,
    cooldownHours: 24,
  },
]

export function energyLevelLabel(level: number): string {
  if (level >= 90) return '共鳴熾盛'
  if (level >= 70) return '能量穩定'
  if (level >= 40) return '需要滋養'
  return '能量低迷'
}

/** 魔法系別（對應 derive_magic_affiliation） */
export const MAGIC_AFFILIATION_OPTIONS = [
  '守護系',
  '增幅系',
  '淨化系',
  '平衡系',
  '靈動系',
] as const

export type MagicAffiliation = (typeof MAGIC_AFFILIATION_OPTIONS)[number]
