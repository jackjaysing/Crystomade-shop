import {
  GRIMOIRE_RANK_TASK_THRESHOLDS,
  nextRankLabel,
  tasksUntilNextRank,
} from '../../lib/grimoireRank'
import type { CrystalSoulCard } from '../../lib/types'
import type { GrimoireTaskType } from '../../constants/grimoire'
import { MagicEnergyMeter } from './MagicEnergyMeter'
import { MagicGrimoireTaskList } from './MagicGrimoireTaskList'

interface MagicGrimoireTaskPanelProps {
  card: CrystalSoulCard
  busy?: boolean
  onCompleteTask: (task: GrimoireTaskType) => Promise<void>
}

/** 右側／底部固定：能量槽 + 修行任務 */
export function MagicGrimoireTaskPanel({
  card,
  busy = false,
  onCompleteTask,
}: MagicGrimoireTaskPanelProps) {
  const tasksRemaining = tasksUntilNextRank(
    card.magic_status,
    card.grimoire_task_count,
    Boolean(card.contract_signed_at)
  )
  const nextRank = nextRankLabel(card.magic_status)

  return (
    <aside
      className={`magic-grimoire-task-panel magic-grimoire-task-panel--tier-${card.magic_status}`}
      aria-label="修行任務"
    >
      <p className="magic-grimoire-task-panel-eyebrow">DAILY RITES · 每日修行</p>
      <h3 className="magic-grimoire-task-panel-title">能量儀式</h3>

      <MagicEnergyMeter card={card} interactive compact />

      {card.contract_signed_at ? (
        <MagicGrimoireTaskList
          card={card}
          busy={busy}
          onCompleteTask={onCompleteTask}
          layout="stack"
        />
      ) : null}

      {!card.contract_signed_at ? (
        <p className="magic-grimoire-task-panel-hint">簽署契約後開啟修行任務</p>
      ) : card.magic_status === 'ascendant' ? (
        <p className="magic-grimoire-task-panel-hint magic-grimoire-task-panel-hint--max">
          已達極境 · 累積 {card.grimoire_task_count} 次 · 每次任務 +2 日常修為
        </p>
      ) : tasksRemaining !== null && nextRank ? (
        <p className="magic-grimoire-task-panel-hint">
          累積 {card.grimoire_task_count} 次 · 距「{nextRank}」還需 {tasksRemaining} 次
          <span className="magic-grimoire-task-panel-thresholds">
            覺醒 {GRIMOIRE_RANK_TASK_THRESHOLDS.awakening} · 共鳴{' '}
            {GRIMOIRE_RANK_TASK_THRESHOLDS.resonating} · 極境{' '}
            {GRIMOIRE_RANK_TASK_THRESHOLDS.ascendant}
          </span>
        </p>
      ) : null}
    </aside>
  )
}
