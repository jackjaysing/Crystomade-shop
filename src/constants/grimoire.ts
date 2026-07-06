/** 水晶靈魂卡覺醒狀態（五階） */
export type CrystalMagicStatus =
  | 'dormant'
  | 'starlight'
  | 'awakening'
  | 'resonating'
  | 'ascendant'

export type GrimoireTaskType = 'purify' | 'moon' | 'meditation'

export const CRYSTAL_MAGIC_STATUS_ORDER: CrystalMagicStatus[] = [
  'dormant',
  'starlight',
  'awakening',
  'resonating',
  'ascendant',
]

export const CRYSTAL_MAGIC_STATUS_LABELS: Record<CrystalMagicStatus, string> = {
  dormant: '初印沉睡',
  starlight: '星芒微亮',
  awakening: '覺醒流動',
  resonating: '共鳴穩定',
  ascendant: '極境永恆',
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
  starlight: {
    tier: 2,
    roman: 'II',
    title: '星芒',
    epithet: '微光乍現',
    flavor: '契約已繕，印記開始透出第一縷光',
  },
  awakening: {
    tier: 3,
    roman: 'III',
    title: '覺醒',
    epithet: '心動之印',
    flavor: '能量開始流動，水晶與你同頻呼吸',
  },
  resonating: {
    tier: 4,
    roman: 'IV',
    title: '共鳴',
    epithet: '同頻之印',
    flavor: '意念與晶石穩定共振，光痕漸趨清晰',
  },
  ascendant: {
    tier: 5,
    roman: 'V',
    title: '極境',
    epithet: '永恆共鳴',
    flavor: '光與意念完全交融，身分證綻放極致光華',
  },
}

export function magicStatusTier(status: CrystalMagicStatus): number {
  return CRYSTAL_MAGIC_RANK[status].tier
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

/** 每個魔法師等級內的子階（星） */
export const MAGICIAN_STARS_PER_LEVEL = 3

export const MAGICIAN_STAR_LABELS = ['一星', '二星', '三星'] as const

/** 會員魔法師等級（依魔導書修為累積；每級再分三星） */
export const MAGICIAN_LEVELS = [
  {
    tier: 1,
    roman: 'I',
    title: '見習魔法師',
    epithet: '靈感初啟',
    flavor: '魔法之門為你敞開，每一本魔導書都是一段修行。',
    minXp: 0,
  },
  {
    tier: 2,
    roman: 'II',
    title: '符文學徒',
    epithet: '印記學徒',
    flavor: '你已能讀懂水晶的細語，符文開始在指尖流轉。',
    minXp: 100,
  },
  {
    tier: 3,
    roman: 'III',
    title: '水晶行者',
    epithet: '脈動行者',
    flavor: '意念與晶石同頻，行走之間自有光痕跟隨。',
    minXp: 280,
  },
  {
    tier: 4,
    roman: 'IV',
    title: '能量編織者',
    epithet: '織光之手',
    flavor: '你編織的不只是能量，而是與水晶之間的永恆連結。',
    minXp: 500,
  },
  {
    tier: 5,
    roman: 'V',
    title: '占星術士',
    epithet: '星盤守望',
    flavor: '五行與星軌皆在掌中，魔導書群為你共鳴。',
    minXp: 720,
  },
  {
    tier: 6,
    roman: 'VI',
    title: '大魔法師',
    epithet: '晶光宗師',
    flavor: '你的修行已臻高深，光與意志融為一體。',
    minXp: 900,
  },
  {
    tier: 7,
    roman: 'VII',
    title: '永恆大魔導',
    epithet: '晶刻至尊',
    flavor: '傳說級的共鳴者，晶刻殿堂為你留名。',
    minXp: 1100,
  },
] as const

/** 極境後每完成一次任務額外獲得的巫師修為 */
export const GRIMOIRE_MERIT_PER_TASK = 2

/** 下單人每本魔導書的固定修為（轉贈後仍保留在下單人） */
export const GRIMOIRE_BUYER_XP_PER_CARD = 15

/** 全帳號每日日常巫師修為上限（極境任務） */
export const GRIMOIRE_MERIT_DAILY_CAP = 6

/** 建議極境典藏本數（達永恆大魔導） */
export const GRIMOIRE_ASCENDANT_COLLECTION_GOAL = 4

export type MagicianLevelDef = (typeof MAGICIAN_LEVELS)[number]
