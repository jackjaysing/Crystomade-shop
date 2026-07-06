import {
  GRIMOIRE_TASKS,
  type GrimoireTaskType,
} from '../../constants/grimoire'
import { formatCooldownRemaining, getTaskCooldownRemainingMs } from '../../lib/grimoireTasks'
import type { CrystalSoulCard } from '../../lib/types'

interface MagicGrimoireTaskListProps {
  card: CrystalSoulCard
  busy?: boolean
  onCompleteTask: (task: GrimoireTaskType) => Promise<void>
  layout?: 'stack' | 'compact'
}

/** 修行任務按鈕列表 */
export function MagicGrimoireTaskList({
  card,
  busy = false,
  onCompleteTask,
  layout = 'stack',
}: MagicGrimoireTaskListProps) {
  return (
    <ul className={`magic-grimoire-tasks magic-grimoire-tasks--${layout}`}>
      {GRIMOIRE_TASKS.map((task) => {
        const cooldownMs = getTaskCooldownRemainingMs(
          card,
          task.type,
          task.cooldownHours
        )
        const onCooldown = cooldownMs > 0
        return (
          <li key={task.type} className="magic-grimoire-task">
            <div className="magic-grimoire-task-text">
              <p className="magic-grimoire-task-label">{task.label}</p>
              {task.description ? (
                <p className="magic-grimoire-task-desc">{task.description}</p>
              ) : null}
              <p className="magic-grimoire-task-boost">+{task.boost} 能量</p>
            </div>
            <button
              type="button"
              disabled={busy || onCooldown}
              onClick={() => void onCompleteTask(task.type)}
              className="magic-grimoire-task-btn"
            >
              {onCooldown ? `冷卻 ${formatCooldownRemaining(cooldownMs)}` : '完成'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
