import type { CrystalMagicStatus } from '../constants/grimoire'

/** 各階所需累積修行次數（簽約後起算） */
export const GRIMOIRE_RANK_TASK_THRESHOLDS = {
  awakening: 6,
  resonating: 15,
  ascendant: 30,
} as const

/** 依契約與累積任務次數推導魔導書階級 */
export function deriveMagicStatus(
  taskCount: number,
  contractSigned: boolean
): CrystalMagicStatus {
  if (!contractSigned) return 'dormant'
  if (taskCount >= GRIMOIRE_RANK_TASK_THRESHOLDS.ascendant) return 'ascendant'
  if (taskCount >= GRIMOIRE_RANK_TASK_THRESHOLDS.resonating) return 'resonating'
  if (taskCount >= GRIMOIRE_RANK_TASK_THRESHOLDS.awakening) return 'awakening'
  return 'starlight'
}

export function tasksUntilNextRank(
  status: CrystalMagicStatus,
  taskCount: number,
  contractSigned: boolean
): number | null {
  if (!contractSigned) return null
  if (status === 'ascendant') return null
  if (status === 'dormant') return 0

  const nextThreshold =
    status === 'starlight'
      ? GRIMOIRE_RANK_TASK_THRESHOLDS.awakening
      : status === 'awakening'
        ? GRIMOIRE_RANK_TASK_THRESHOLDS.resonating
        : GRIMOIRE_RANK_TASK_THRESHOLDS.ascendant

  return Math.max(0, nextThreshold - taskCount)
}

export function nextRankLabel(status: CrystalMagicStatus): string | null {
  if (status === 'dormant' || status === 'starlight') return '覺醒'
  if (status === 'awakening') return '共鳴'
  if (status === 'resonating') return '極境'
  return null
}
