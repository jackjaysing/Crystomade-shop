import { useEffect, useState } from 'react'
import {
  CRYSTAL_MAGIC_RANK,
  type CrystalMagicStatus,
} from '../../constants/grimoire'

interface RankUpOverlayProps {
  status: CrystalMagicStatus
  onDone: () => void
}

/** 階級晉升慶祝動畫 */
export function RankUpOverlay({ status, onDone }: RankUpOverlayProps) {
  const [phase, setPhase] = useState<'burst' | 'fade'>('burst')
  const rank = CRYSTAL_MAGIC_RANK[status]

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase('fade'), 2200)
    const doneTimer = window.setTimeout(onDone, 3000)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div
      className={`magic-rank-up-overlay magic-rank-up-overlay--${status} magic-rank-up-overlay--${phase}`}
      role="status"
      aria-live="polite"
    >
      <div className="magic-rank-up-burst" aria-hidden />
      <div className="magic-rank-up-content">
        <p className="magic-rank-up-eyebrow">階級晉升</p>
        <p className="magic-rank-up-roman">{rank.roman}</p>
        <h3 className="magic-rank-up-title">{rank.title}</h3>
        <p className="magic-rank-up-epithet">{rank.epithet}</p>
        <p className="magic-rank-up-flavor">{rank.flavor}</p>
      </div>
    </div>
  )
}
