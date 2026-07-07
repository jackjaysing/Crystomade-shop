import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  energyLevelLabel,
  type GrimoireTaskType,
} from '../../constants/grimoire'
import {
  GRIMOIRE_RANK_TASK_THRESHOLDS,
  nextRankLabel,
  tasksUntilNextRank,
} from '../../lib/grimoireRank'
import type { CrystalSoulCard } from '../../lib/types'
import { MagicEnergyMeter } from './MagicEnergyMeter'
import { MagicGrimoireTaskList } from './MagicGrimoireTaskList'

interface MagicGrimoireTaskPanelProps {
  card: CrystalSoulCard
  busy?: boolean
  onCompleteTask: (task: GrimoireTaskType) => Promise<void>
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

/** 右側／底部固定：能量槽 + 修行任務 */
export function MagicGrimoireTaskPanel({
  card,
  busy = false,
  onCompleteTask,
}: MagicGrimoireTaskPanelProps) {
  const [collapsed, setCollapsed] = useState(isMobileViewport)
  const tasksRemaining = tasksUntilNextRank(
    card.magic_status,
    card.grimoire_task_count,
    Boolean(card.contract_signed_at)
  )
  const nextRank = nextRankLabel(card.magic_status)

  return (
    <aside
      className={`magic-grimoire-task-panel magic-grimoire-task-panel--tier-${card.magic_status}${
        collapsed ? ' magic-grimoire-task-panel--collapsed' : ''
      }`}
      aria-label="修行任務"
    >
      <div className="magic-grimoire-task-panel-head">
        <div className="magic-grimoire-task-panel-head-text">
          <p className="magic-grimoire-task-panel-eyebrow">DAILY RITES · 每日修行</p>
          <div className="magic-grimoire-task-panel-title-row">
            <h3 className="magic-grimoire-task-panel-title">能量儀式</h3>
            <p className="magic-grimoire-task-panel-collapsed-meta" aria-hidden={!collapsed}>
              {card.energy_level}% · {energyLevelLabel(card.energy_level)}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="magic-grimoire-task-panel-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展開修行任務' : '收起修行任務'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <div className="magic-grimoire-task-panel-body">
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
      </div>
    </aside>
  )
}
