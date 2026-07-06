import type { GrimoireTaskType } from '../constants/grimoire'
import type { CrystalSoulCard } from './types'

const TASK_LAST_FIELD: Record<
  GrimoireTaskType,
  keyof Pick<
    CrystalSoulCard,
    'last_purify_at' | 'last_moon_charge_at' | 'last_meditation_at'
  >
> = {
  purify: 'last_purify_at',
  moon: 'last_moon_charge_at',
  meditation: 'last_meditation_at',
}

export function getTaskCooldownRemainingMs(
  card: CrystalSoulCard,
  taskType: GrimoireTaskType,
  cooldownHours: number
): number {
  const lastAt = card[TASK_LAST_FIELD[taskType]]
  if (!lastAt) return 0
  const ends = new Date(lastAt).getTime() + cooldownHours * 60 * 60 * 1000
  return Math.max(0, ends - Date.now())
}

export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return ''
  const totalMinutes = Math.ceil(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} 小時 ${minutes} 分`
  return `${minutes} 分鐘`
}
