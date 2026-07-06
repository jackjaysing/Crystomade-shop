import {
  CRYSTAL_MAGIC_RANK,
  type CrystalMagicStatus,
} from '../../constants/grimoire'

interface MagicRankBadgeProps {
  status: CrystalMagicStatus
  compact?: boolean
}

/** 水晶魔法身分證階級徽章 */
export function MagicRankBadge({ status, compact = false }: MagicRankBadgeProps) {
  const rank = CRYSTAL_MAGIC_RANK[status]

  return (
    <div
      className={`magic-rank-badge magic-rank-badge--${status}${compact ? ' magic-rank-badge--compact' : ''}`}
      aria-label={`第 ${rank.tier} 階 · ${rank.epithet}`}
    >
      <span className="magic-rank-badge-roman" aria-hidden>
        {rank.roman}
      </span>
      <div className="magic-rank-badge-text">
        <p className="magic-rank-badge-tier">第 {rank.tier} 階</p>
        <p className="magic-rank-badge-title">{rank.title}</p>
        {!compact && <p className="magic-rank-badge-epithet">{rank.epithet}</p>}
      </div>
    </div>
  )
}
