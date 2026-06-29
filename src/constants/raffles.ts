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

/** 會員已看過的開放報名抽獎（用於 NEW 標記） */
export const RAFFLE_ACTIVITY_SEEN_KEY = 'crystomade-raffle-activity-seen'

/** 抽獎禮物券說明（固定文案，前台顯示與禮物券同步） */
export const RAFFLE_GIFT_DESCRIPTION = '不限額「隨單送」'

/** 抽獎禮物券發放後有效天數 */
export const RAFFLE_GIFT_VALID_DAYS = 30

export const RAFFLE_GIFT_DISPLAY_NOTE = `${RAFFLE_GIFT_DESCRIPTION} · 發放後保留${RAFFLE_GIFT_VALID_DAYS}日`
