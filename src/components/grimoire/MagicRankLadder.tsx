import {
  CRYSTAL_MAGIC_RANK,
  CRYSTAL_MAGIC_STATUS_ORDER,
  type CrystalMagicStatus,
} from '../../constants/grimoire'

interface MagicRankLadderProps {
  current: CrystalMagicStatus
}

/** 五階晉升路徑 */
export function MagicRankLadder({ current }: MagicRankLadderProps) {
  const currentTier = CRYSTAL_MAGIC_RANK[current].tier

  return (
    <ol className="magic-rank-ladder" aria-label="魔法身分證階級">
      {CRYSTAL_MAGIC_STATUS_ORDER.map((status) => {
        const rank = CRYSTAL_MAGIC_RANK[status]
        const state =
          rank.tier < currentTier
            ? 'passed'
            : rank.tier === currentTier
              ? 'current'
              : 'locked'

        return (
          <li
            key={status}
            className={`magic-rank-step magic-rank-step--${state} magic-rank-step--${status}`}
          >
            <span className="magic-rank-step-roman">{rank.roman}</span>
            <span className="magic-rank-step-label">{rank.title}</span>
          </li>
        )
      })}
    </ol>
  )
}
