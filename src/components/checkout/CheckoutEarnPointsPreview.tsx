import { Sparkles } from 'lucide-react'
import {
  calcEarnedPointsFromSpentWithBonus,
  calcEarnedRewardNtdFromSpent,
} from '../../lib/pointsCalculation'

interface CheckoutEarnPointsPreviewProps {
  spendNtd: number
  firstPurchase: boolean
  loading?: boolean
}

/** 結帳：預計消費回饋點數 */
export function CheckoutEarnPointsPreview({
  spendNtd,
  firstPurchase,
  loading = false,
}: CheckoutEarnPointsPreviewProps) {
  if (loading || spendNtd <= 0) return null

  const earnedPoints = calcEarnedPointsFromSpentWithBonus(spendNtd, firstPurchase)
  if (earnedPoints <= 0) return null

  const rewardNtd = calcEarnedRewardNtdFromSpent(spendNtd, firstPurchase)

  return (
    <div className="rounded-lg border border-amber-glow/25 bg-amber-glow/[0.06] p-4">
      <div className="flex items-start gap-3">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-glow"
          strokeWidth={1.5}
        />
        <div>
          <p className="text-sm text-white/85">
            本單預計累積{' '}
            <span className="font-medium text-amber-glow">{earnedPoints}</span> 點
            <span className="text-white/55">
              {' '}
              （約 NT${rewardNtd.toLocaleString()}，已付款或出貨後入帳）
            </span>
          </p>
          {firstPurchase && (
            <p className="mt-1 text-xs text-amber-glow/80">首購雙倍累點適用中</p>
          )}
          <p className="mt-1 text-[11px] text-white/35">
            會員回饋 2% · 每 10 點可折 NT$1
          </p>
        </div>
      </div>
    </div>
  )
}
