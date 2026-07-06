import { useEffect, useState } from 'react'
import {
  ENERGY_CONTRACT_TITLE,
  energyLevelLabel,
  type GrimoireTaskType,
} from '../../constants/grimoire'
import type { CrystalSoulCard } from '../../lib/types'

import { MagicGrimoireTaskList } from './MagicGrimoireTaskList'

interface MagicEnergyMeterProps {
  card: CrystalSoulCard
  interactive?: boolean
  busy?: boolean
  compact?: boolean
  showTasks?: boolean
  onCompleteTask?: (task: GrimoireTaskType) => Promise<void>
}

/** 動態能量槽與互動任務 */
export function MagicEnergyMeter({
  card,
  interactive = false,
  busy = false,
  compact = false,
  showTasks = true,
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
      className={`magic-meter magic-meter--tier-${card.magic_status}${pulse ? ' magic-meter--pulse' : ''}${compact ? ' magic-meter--compact' : ''}`}
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

      {interactive && showTasks && onCompleteTask && card.contract_signed_at && (
        <MagicGrimoireTaskList
          card={card}
          busy={busy}
          onCompleteTask={onCompleteTask}
        />
      )}

      {!interactive && card.contract_signed_at && (
        <p className="magic-meter-readonly">
          已與 {card.contract_signer_name || '主人'} 締結{ENERGY_CONTRACT_TITLE}
        </p>
      )}
    </section>
  )
}
