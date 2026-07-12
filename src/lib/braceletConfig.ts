import { FIVE_ELEMENTS, type FiveElement } from '../constants/fiveElements'
import {
  BEAD_SIZE_LABELS,
  BEAD_SIZE_MM_MID,
  resolveBeadDisplaySize,
  type BeadSizeCategory,
} from '../constants/beadSizes'
import { BRACELET_SIZE_UNDECIDED } from '../constants/braceletSizes'
import { pickEfficacyTags } from './efficacyTags'
import { sanitizeFiveElements } from './fiveElements'

/** 配置器珠材快照（寫入購物車／訂單） */
export interface BraceletConfigBead {
  bead_id: string
  name: string
  /** 五行（可多選：雙屬／綜合） */
  elements: FiveElement[]
  /** 此顆選用的咪數區間 */
  size: BeadSizeCategory
  efficacy_tags: string[]
  image_url: string
}

export interface BraceletConfigGoals {
  elements: FiveElement[]
  efficacy: string[]
}

export interface BraceletConfig {
  wrist_size: string
  /** 自行配珠（官方配珠不下單配置快照） */
  mode?: 'self'
  /** 客戶希望官方協助確認配置準確度 */
  request_official_review?: boolean
  goals: BraceletConfigGoals
  beads: BraceletConfigBead[]
}

export interface BeadCountHint {
  min: number
  max: number
  label: string
}

export type BraceletFitStatus = 'empty' | 'need_wrist' | 'short' | 'ok' | 'long'

/** 依手圍＋咪數估算是否合身 */
export interface BraceletFitAssessment {
  status: BraceletFitStatus
  beadCount: number
  estimatedMm: number
  wristMm: number | null
  targetMinMm: number | null
  targetMaxMm: number | null
  /** 相對目標中點：正＝偏長、負＝偏短 */
  deltaMm: number
  suggestAdd: number
  suggestRemove: number
  headline: string
  detail: string
}

/** 顯示珠材五行文案，例如「水／金」 */
export function formatBeadElements(elements: FiveElement[]): string {
  const cleaned = sanitizeFiveElements(elements)
  if (cleaned.length === 0) return '—'
  return cleaned.join('／')
}

export function formatBeadSizeLabel(size: BeadSizeCategory | string | null | undefined): string {
  const resolved = resolveBeadDisplaySize(size)
  return BEAD_SIZE_LABELS[resolved]
}

function resolveBeadElements(bead: Record<string, unknown>): FiveElement[] {
  if (Array.isArray(bead.elements)) {
    return sanitizeFiveElements(bead.elements.map(String))
  }
  // 相容舊快照：單一 element
  const singular = String(bead.element ?? '').trim()
  return sanitizeFiveElements(singular ? [singular] : [])
}

function resolveConfigBeadSize(bead: Record<string, unknown>): BeadSizeCategory {
  if (bead.size != null) return resolveBeadDisplaySize(String(bead.size))
  if (Array.isArray(bead.sizes) && bead.sizes.length > 0) {
    return resolveBeadDisplaySize(String(bead.sizes[0]))
  }
  return '7-9'
}

function parseWristCm(wristSize: string | null | undefined): number | null {
  const raw = wristSize?.trim() || ''
  if (!raw || raw === BRACELET_SIZE_UNDECIDED) return null
  const cm = Number(raw.replace(/cm$/i, ''))
  return Number.isFinite(cm) && cm > 0 ? cm : null
}

/** 珠串估算周長（mm）：各珠代表咪數加總 */
export function estimateBraceletLengthMm(
  beads: Pick<BraceletConfigBead, 'size'>[]
): number {
  return beads.reduce((sum, bead) => {
    const size = resolveBeadDisplaySize(bead.size)
    return sum + BEAD_SIZE_MM_MID[size]
  }, 0)
}

function averageBeadMm(beads: Pick<BraceletConfigBead, 'size'>[]): number {
  if (beads.length === 0) return BEAD_SIZE_MM_MID['7-9']
  return estimateBraceletLengthMm(beads) / beads.length
}

/** 依淨手圍估算建議珠數（約 8mm 珠） */
export function suggestedBeadCount(wristSize: string | null | undefined): BeadCountHint {
  const cm = parseWristCm(wristSize)
  if (cm == null) {
    const raw = wristSize?.trim() || BRACELET_SIZE_UNDECIDED
    if (raw === BRACELET_SIZE_UNDECIDED) {
      return { min: 18, max: 24, label: '約 18–24 顆（手圍未定・以 8mm 估算）' }
    }
    return { min: 18, max: 24, label: '約 18–24 顆（以 8mm 估算）' }
  }
  const mid = Math.round((cm * 10) / BEAD_SIZE_MM_MID['7-9'])
  const min = Math.max(14, mid - 2)
  const max = mid + 2
  return { min, max, label: `約 ${min}–${max} 顆（以 8mm 估算）` }
}

/**
 * 依手圍與實際咪數判斷串長是否合適。
 * 目標略鬆於淨手圍，容差約 ±8mm（彈性手串參考）。
 */
export function assessBraceletFit(
  wristSize: string | null | undefined,
  beads: Pick<BraceletConfigBead, 'size'>[]
): BraceletFitAssessment {
  const beadCount = beads.length
  const estimatedMm = estimateBraceletLengthMm(beads)
  const wristCm = parseWristCm(wristSize)

  if (beadCount === 0) {
    return {
      status: 'empty',
      beadCount: 0,
      estimatedMm: 0,
      wristMm: wristCm != null ? Math.round(wristCm * 10) : null,
      targetMinMm: null,
      targetMaxMm: null,
      deltaMm: 0,
      suggestAdd: 0,
      suggestRemove: 0,
      headline: '尚未選珠',
      detail:
        wristCm != null
          ? `請依手圍 ${wristCm}cm 加入珠材；下方會依咪數估算是否合身`
          : '請先選擇淨手圍並加入珠材',
    }
  }

  if (wristCm == null) {
    return {
      status: 'need_wrist',
      beadCount,
      estimatedMm,
      wristMm: null,
      targetMinMm: null,
      targetMaxMm: null,
      deltaMm: 0,
      suggestAdd: 0,
      suggestRemove: 0,
      headline: '請先選擇淨手圍',
      detail: `目前約 ${beadCount} 顆、串長估算 ${estimatedMm}mm；選定手圍後可判斷增減`,
    }
  }

  const wristMm = Math.round(wristCm * 10)
  const targetMid = wristMm + 4
  const targetMinMm = targetMid - 8
  const targetMaxMm = targetMid + 8
  const deltaMm = estimatedMm - targetMid
  const avgMm = averageBeadMm(beads)

  if (estimatedMm < targetMinMm) {
    const shortfall = targetMinMm - estimatedMm
    const suggestAdd = Math.max(1, Math.ceil(shortfall / avgMm))
    return {
      status: 'short',
      beadCount,
      estimatedMm,
      wristMm,
      targetMinMm,
      targetMaxMm,
      deltaMm,
      suggestAdd,
      suggestRemove: 0,
      headline: `偏短，建議再加約 ${suggestAdd} 顆`,
      detail: `手圍 ${wristCm}cm（目標約 ${targetMinMm}–${targetMaxMm}mm）· 目前估算 ${estimatedMm}mm（${beadCount} 顆）· 亦可改用較大咪數`,
    }
  }

  if (estimatedMm > targetMaxMm) {
    const excess = estimatedMm - targetMaxMm
    const suggestRemove = Math.max(1, Math.ceil(excess / avgMm))
    return {
      status: 'long',
      beadCount,
      estimatedMm,
      wristMm,
      targetMinMm,
      targetMaxMm,
      deltaMm,
      suggestAdd: 0,
      suggestRemove,
      headline: `偏長，建議減少約 ${suggestRemove} 顆`,
      detail: `手圍 ${wristCm}cm（目標約 ${targetMinMm}–${targetMaxMm}mm）· 目前估算 ${estimatedMm}mm（${beadCount} 顆）· 亦可改用較小咪數`,
    }
  }

  return {
    status: 'ok',
    beadCount,
    estimatedMm,
    wristMm,
    targetMinMm,
    targetMaxMm,
    deltaMm,
    suggestAdd: 0,
    suggestRemove: 0,
    headline: '顆數與咪數大致合此手圍',
    detail: `手圍 ${wristCm}cm（目標約 ${targetMinMm}–${targetMaxMm}mm）· 目前估算 ${estimatedMm}mm（${beadCount} 顆）· 仍可依手感微調`,
  }
}

export function normalizeBraceletConfig(raw: unknown): BraceletConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const wrist =
    row.wrist_size != null
      ? String(row.wrist_size).trim()
      : row.wristSize != null
        ? String(row.wristSize).trim()
        : ''
  if (!wrist) return null

  const goalsRaw =
    row.goals && typeof row.goals === 'object'
      ? (row.goals as Record<string, unknown>)
      : {}
  const elements = sanitizeFiveElements(
    Array.isArray(goalsRaw.elements) ? goalsRaw.elements.map(String) : []
  )
  const efficacy = pickEfficacyTags(
    Array.isArray(goalsRaw.efficacy) ? goalsRaw.efficacy.map(String) : []
  )

  const beadsRaw = Array.isArray(row.beads) ? row.beads : []
  const beads: BraceletConfigBead[] = []
  for (const item of beadsRaw) {
    if (!item || typeof item !== 'object') continue
    const bead = item as Record<string, unknown>
    const beadElements = resolveBeadElements(bead)
    if (beadElements.length === 0) continue
    const beadId = String(bead.bead_id ?? bead.beadId ?? '').trim()
    const name = String(bead.name ?? '').trim()
    if (!beadId || !name) continue
    beads.push({
      bead_id: beadId,
      name,
      elements: beadElements,
      size: resolveConfigBeadSize(bead),
      efficacy_tags: pickEfficacyTags(
        Array.isArray(bead.efficacy_tags)
          ? bead.efficacy_tags.map(String)
          : Array.isArray(bead.efficacyTags)
            ? bead.efficacyTags.map(String)
            : []
      ),
      image_url: String(bead.image_url ?? bead.imageUrl ?? ''),
    })
  }

  if (beads.length === 0) return null

  return {
    wrist_size: wrist,
    mode: 'self',
    request_official_review: Boolean(row.request_official_review),
    goals: { elements, efficacy },
    beads,
  }
}

/** 用於購物車列唯一識別（同商品不同配置不合併） */
export function braceletConfigFingerprint(config: BraceletConfig): string {
  const beadPart = config.beads.map((b) => `${b.bead_id}:${b.size}`).join(',')
  const goalEl = config.goals.elements.join('')
  const goalTag = config.goals.efficacy.join('')
  const review = config.request_official_review ? '1' : '0'
  return `${config.wrist_size}|${goalEl}|${goalTag}|${review}|${beadPart}`
}

/** 統計：每顆珠對其所有五行各計 1（雙屬珠同時補兩行） */
export function countElementsInConfig(
  beads: BraceletConfigBead[]
): Record<FiveElement, number> {
  const counts = Object.fromEntries(FIVE_ELEMENTS.map((el) => [el, 0])) as Record<
    FiveElement,
    number
  >
  for (const bead of beads) {
    for (const el of bead.elements) {
      counts[el] += 1
    }
  }
  return counts
}

export function collectEfficacyFromBeads(beads: BraceletConfigBead[]): string[] {
  const set = new Set<string>()
  for (const bead of beads) {
    for (const tag of bead.efficacy_tags) set.add(tag)
  }
  return pickEfficacyTags([...set])
}

export type ElementBalanceStatus = 'weak' | 'ok' | 'strong'

export interface ElementBalanceRow {
  element: FiveElement
  count: number
  share: number
  status: ElementBalanceStatus
  note: string
}

export interface BraceletBalanceSummary {
  total: number
  rows: ElementBalanceRow[]
  efficacyMatched: string[]
  efficacyMissing: string[]
  headline: string
}

/** 規則型五行／功效提示（非命盤演算） */
export function computeBraceletBalance(
  config: Pick<BraceletConfig, 'goals' | 'beads'>
): BraceletBalanceSummary {
  const total = config.beads.length
  const counts = countElementsInConfig(config.beads)
  const goalSet = new Set(config.goals.elements)
  const collected = collectEfficacyFromBeads(config.beads)
  const collectedSet = new Set(collected)
  const efficacyMatched = config.goals.efficacy.filter((t) => collectedSet.has(t))
  const efficacyMissing = config.goals.efficacy.filter((t) => !collectedSet.has(t))

  const rows: ElementBalanceRow[] = FIVE_ELEMENTS.map((element) => {
    const count = counts[element]
    // 占比以珠數為分母：雙屬珠可同時拉高兩行覆蓋率
    const share = total > 0 ? count / total : 0
    const isGoal = goalSet.has(element)

    let status: ElementBalanceStatus = 'ok'
    let note = '大致平衡'

    if (total === 0) {
      note = '尚未選珠'
    } else if (isGoal && count === 0) {
      status = 'weak'
      note = '目標偏弱'
    } else if (isGoal && share < 0.12) {
      status = 'weak'
      note = '目標偏弱'
    } else if (!isGoal && share >= 0.4) {
      status = 'strong'
      note = '占比偏高'
    } else if (isGoal && share >= 0.15) {
      note = '目標有補'
    }

    return { element, count, share, status, note }
  })

  let headline = '請先加入珠材'
  if (total > 0) {
    const weakGoals = rows.filter((r) => goalSet.has(r.element) && r.status === 'weak')
    const strongExtra = rows.filter((r) => !goalSet.has(r.element) && r.status === 'strong')
    if (goalSet.size === 0) {
      headline = strongExtra.length > 0 ? '某一行占比偏高，可再微調' : '目前配置大致平均'
    } else if (weakGoals.length > 0) {
      headline = `建議再補：${weakGoals.map((r) => r.element).join('、')}`
    } else if (strongExtra.length > 0) {
      headline = '目標五行已有補，其餘行可再收斂'
    } else {
      headline = '目標五行大致到位'
    }
  }

  return {
    total,
    rows,
    efficacyMatched,
    efficacyMissing,
    headline,
  }
}

export function formatBraceletConfigSummary(config: BraceletConfig | null | undefined): string {
  if (!config?.beads.length) return ''
  const review = config.request_official_review ? ' · 需官方確認' : ''
  return `自行配珠 ${config.beads.length} 顆${review}`
}
