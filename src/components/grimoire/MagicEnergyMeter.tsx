import { useEffect, useState } from 'react'
import {
  ENERGY_CONTRACT_TITLE,
  GRIMOIRE_TASKS,
  energyLevelLabel,
  type GrimoireTaskType,
} from '../../constants/grimoire'
import { formatCooldownRemaining, getTaskCooldownRemainingMs } from '../../lib/grimoireTasks'
import type { CrystalSoulCard } from '../../lib/types'

interface MagicEnergyMeterProps {
  card: CrystalSoulCard
  interactive?: boolean
  busy?: boolean
  onCompleteTask?: (task: GrimoireTaskType) => Promise<void>
}

/** 動態能量槽與互動任務 */
export function MagicEnergyMeter({
  card,
  interactive = false,
  busy = false,
  onCompleteTask,
}: MagicEnergyMeterProps) {
  const [displayLevel, setDisplayLevel] = useState(card.energy_level)
  const [pulse, setPulse] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (card.energy_level === displayLevel) return
    setPulse(true)
    const start = displayLevel
    const end = card.energy_level
    const startTime = performance.now()
    const duration = 700

    let frame: number
    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplayLevel(Math.round(start + (end - start) * eased))
      if (t < 1) frame = requestAnimationFrame(animate)
      else window.setTimeout(() => setPulse(false), 400)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [card.energy_level, displayLevel])

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section
      className={`magic-meter magic-meter--tier-${card.magic_status}${pulse ? ' magic-meter--pulse' : ''}`}
      aria-labelledby="magic-meter-heading"
    >
      <div className="magic-meter-header">
        <h4 id="magic-meter-heading" className="magic-meter-title">
          水晶能量槽
        </h4>
        <div className="magic-meter-readout">
          <span className="magic-meter-percent" aria-hidden>
            {displayLevel}
            <span className="magic-meter-percent-unit">%</span>
          </span>
          <span className="magic-meter-label">{energyLevelLabel(displayLevel)}</span>
        </div>
      </div>
      <div className={`magic-meter-track ${pulse ? 'magic-meter-pulse' : ''}`}>
        <div
          className="magic-meter-fill"
          style={{ width: `${displayLevel}%` }}
          role="progressbar"
          aria-valuenow={displayLevel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`能量 ${displayLevel}%`}
        />
      </div>

      {interactive && onCompleteTask && card.contract_signed_at && (
        <ul className="magic-meter-tasks">
          {GRIMOIRE_TASKS.map((task) => {
            const cooldownMs = getTaskCooldownRemainingMs(
              card,
              task.type,
              task.cooldownHours
            )
            const onCooldown = cooldownMs > 0
            return (
              <li key={task.type} className="magic-meter-task">
                <div className="magic-meter-task-text">
                  <p className="magic-meter-task-label">{task.label}</p>
                  {task.description ? (
                    <p className="magic-meter-task-desc">{task.description}</p>
                  ) : null}
                  <p className="magic-meter-task-boost">+{task.boost} 能量</p>
                </div>
                <button
                  type="button"
                  disabled={busy || onCooldown}
                  onClick={() => void onCompleteTask(task.type)}
                  className="magic-meter-task-btn"
                >
                  {onCooldown
                    ? `冷卻 ${formatCooldownRemaining(cooldownMs)}`
                    : '完成'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!interactive && card.contract_signed_at && (
        <p className="magic-meter-readonly">
          已與 {card.contract_signer_name || '主人'} 締結{ENERGY_CONTRACT_TITLE}
        </p>
      )}
    </section>
  )
}
