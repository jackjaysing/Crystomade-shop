import { POINTS_PER_NTD_DISCOUNT } from '../../constants/points'
import {
  calcDiscountNtdFromPoints,
  calcMaxDiscountNtd,
  clampPointsForDiscount,
} from '../../lib/pointsCalculation'

interface CheckoutPointsDiscountProps {
  memberPoints: number
  productSubtotal: number
  pointsToUse: number
  pointsReservedForRedemption?: number
  onPointsChange: (points: number) => void
}

/** 結帳：點數折抵（不含運費、上限 10%） */
export function CheckoutPointsDiscount({
  memberPoints,
  productSubtotal,
  pointsToUse,
  pointsReservedForRedemption = 0,
  onPointsChange,
}: CheckoutPointsDiscountProps) {
  const availablePoints = Math.max(0, memberPoints - pointsReservedForRedemption)
  const maxDiscountNtd = calcMaxDiscountNtd(productSubtotal, availablePoints)
  const maxPoints = maxDiscountNtd * POINTS_PER_NTD_DISCOUNT
  const discountNtd = calcDiscountNtdFromPoints(
    clampPointsForDiscount(
      pointsToUse,
      productSubtotal,
      memberPoints,
      pointsReservedForRedemption
    )
  )

  if (productSubtotal <= 0 || availablePoints < POINTS_PER_NTD_DISCOUNT) {
    return null
  }

  const useMax = () => {
    onPointsChange(maxPoints)
  }

  return (
    <div className="rounded-lg border border-amber-glow/20 bg-amber-glow/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/80">點數折抵現金</p>
        <p className="text-xs text-white/45">
          可用 {availablePoints} 點 · 本單最多折 NT${maxDiscountNtd.toLocaleString()}
          （僅付費商品、不含運費）
        </p>
      </div>
      <p className="mt-1 text-[11px] text-white/35">
        每 {POINTS_PER_NTD_DISCOUNT} 點折 NT$1
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={maxPoints}
          step={POINTS_PER_NTD_DISCOUNT}
          value={pointsToUse || ''}
          onChange={(e) => {
            const v = Number(e.target.value) || 0
            onPointsChange(
              clampPointsForDiscount(
                v,
                productSubtotal,
                memberPoints,
                pointsReservedForRedemption
              )
            )
          }}
          placeholder="0"
          className="input-field w-28"
        />
        <span className="text-sm text-white/50">點</span>
        <button
          type="button"
          onClick={useMax}
          className="rounded-full border border-amber-glow/30 px-3 py-1 text-xs text-amber-glow transition hover:bg-amber-glow/10"
        >
          使用最高折抵
        </button>
      </div>

      {discountNtd > 0 && (
        <p className="mt-2 text-sm text-emerald-400/90">
          折抵 NT$ {discountNtd.toLocaleString()}
        </p>
      )}
    </div>
  )
}
