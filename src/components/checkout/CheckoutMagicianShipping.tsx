import {
  magicianShippingPeriodLabel,
  type MagicianShippingQuota,
} from '../../lib/grimoireMagicianShipping'

interface CheckoutMagicianShippingProps {
  quota: MagicianShippingQuota
  useMagicianShipping: boolean
  onUseMagicianShippingChange: (value: boolean) => void
  applied: boolean
}

/** 結帳：魔法師免運額度選項 */
export function CheckoutMagicianShipping({
  quota,
  useMagicianShipping,
  onUseMagicianShippingChange,
  applied,
}: CheckoutMagicianShippingProps) {
  const periodLabel = magicianShippingPeriodLabel(quota.periodKey)
  const periodHint = periodLabel.includes('季')
    ? periodLabel
    : periodLabel || '本期'

  return (
    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-glow/20 bg-amber-glow/5 px-3 py-2.5">
      <input
        type="checkbox"
        className="mt-1"
        checked={useMagicianShipping}
        onChange={(e) => onUseMagicianShippingChange(e.target.checked)}
      />
      <span className="text-sm leading-relaxed text-white/75">
        使用魔法師免運額度
        <span className="mt-0.5 block text-xs text-amber-glow/80">
          {periodHint} 剩餘 {quota.remaining}/{quota.limit} 次
        </span>
        {applied && (
          <span className="mt-1 block text-xs text-emerald-300/90">已套用魔法師免運</span>
        )}
      </span>
    </label>
  )
}
