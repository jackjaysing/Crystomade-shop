import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { usePointRedeemState } from '../../hooks/usePointRedeemState'

interface MemberPointsBadgeProps {
  /** compact：導覽列；drawer：購物車標題列 */
  variant?: 'compact' | 'drawer'
}

/** 會員可用點數（已扣除購物車內兌換預留） */
export function MemberPointsBadge({ variant = 'compact' }: MemberPointsBadgeProps) {
  const { profile, availablePoints, pointsReserved } = usePointRedeemState()

  if (!profile) return null

  if (variant === 'drawer') {
    return (
      <Link
        to="/point-shop"
        className="mt-2 flex items-center justify-between rounded-lg border border-amber-glow/25 bg-amber-glow/[0.06] px-3 py-2 transition hover:border-amber-glow/40"
      >
        <span className="flex items-center gap-2 text-xs text-white/55">
          <Sparkles className="h-3.5 w-3.5 text-amber-glow" strokeWidth={1.5} />
          我的點數
        </span>
        <span className="text-sm font-medium text-amber-glow">
          {availablePoints} 點
          {pointsReserved > 0 && (
            <span className="ml-1 text-[10px] font-normal text-white/40">
              （預留 {pointsReserved}）
            </span>
          )}
        </span>
      </Link>
    )
  }

  return (
    <Link
      to="/point-shop"
      className="flex items-center gap-1.5 rounded-full border border-amber-glow/30 bg-amber-glow/[0.08] px-2.5 py-1 transition hover:border-amber-glow/50 hover:bg-amber-glow/15"
      title={
        pointsReserved > 0
          ? `可用 ${availablePoints} 點（購物車已預留 ${pointsReserved} 點）`
          : `目前擁有 ${availablePoints} 點`
      }
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-glow" strokeWidth={1.5} />
      <span className="text-xs font-medium tabular-nums text-amber-glow">
        {availablePoints}
      </span>
      <span className="hidden text-[10px] text-amber-glow/70 sm:inline">點</span>
    </Link>
  )
}
