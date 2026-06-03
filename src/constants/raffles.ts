import type { RaffleStatus } from '../lib/types'

export const RAFFLE_STATUS_LABELS: Record<RaffleStatus, string> = {
  open: '報名中',
  drawn: '已開獎',
  cancelled: '已取消',
}

export const RAFFLE_FAB_STORAGE_KEY = 'crystomade-raffle-fab-mode'

/** visible：左側完整顯示；collapsed：向左收合 */
export type RaffleFabMode = 'visible' | 'collapsed'

export const RAFFLE_RESULT_SEEN_KEY = 'crystomade-raffle-result-seen'
