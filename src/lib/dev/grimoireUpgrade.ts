import type { GrimoireTaskType } from '../../constants/grimoire'
import type { CrystalSoulCard } from '../types'
import {
  advanceCrystalSoulCardStatus,
  completeCrystalGrimoireTask,
  signCrystalEnergyContract,
} from '../api/grimoire'

const DEV_TASKS: GrimoireTaskType[] = ['purify', 'moon', 'meditation']

/** 開發測試：簽約 → 覺醒滿級 → 盡量灌滿能量槽 */
export async function devMaxUpgradeCrystalSoulCard(
  card: CrystalSoulCard,
  signerName?: string
): Promise<CrystalSoulCard> {
  let current = card

  if (!current.contract_signed_at) {
    current = await signCrystalEnergyContract(current.id, signerName)
  }

  for (let step = 0; step < 2 && current.magic_status !== 'resonating'; step += 1) {
    const next = await advanceCrystalSoulCardStatus(current.id)
    if (next.magic_status === current.magic_status) break
    current = next
  }

  for (const task of DEV_TASKS) {
    try {
      current = await completeCrystalGrimoireTask(current.id, task)
    } catch {
      /* 冷卻中則略過 */
    }
  }

  return current
}
