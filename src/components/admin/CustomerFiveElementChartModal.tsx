import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { FIVE_ELEMENTS, type FiveElement, type WeightedElement } from '../../constants/fiveElements'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import {
  EMPTY_MEMBER_FIVE_ELEMENT_CHART,
  deriveMissingElements,
} from '../../lib/memberFiveElementChart'
import type { AdminRegisteredCustomer } from '../../lib/types'
import type { MemberFiveElementChart } from '../../constants/fiveElements'
import { GlassPanel } from '../ui/GlassPanel'
import { AdminChartTrioPicker } from './AdminChartTrioPicker'
import { AdminWeightedFiveElementsPicker } from './AdminWeightedFiveElementsPicker'

interface CustomerFiveElementChartModalProps {
  customer: AdminRegisteredCustomer
  saving: boolean
  onClose: () => void
  onSave: (chart: MemberFiveElementChart) => void | Promise<void>
}

function cloneChart(
  chart: MemberFiveElementChart | null | undefined
): MemberFiveElementChart {
  if (!chart) return { ...EMPTY_MEMBER_FIVE_ELEMENT_CHART }
  return {
    natal: [...chart.natal],
    composite: [...chart.composite],
    balance: chart.balance.map((item) => ({ ...item })),
    reduce: chart.reduce.map((item) => ({ ...item })),
    note: chart.note,
  }
}

function defaultBalanceFromMissing(missing: FiveElement[]): WeightedElement[] {
  return missing.map((element) => ({ element, intensity: '中' as const }))
}

/** 後台：編輯會員五行命盤 */
export function CustomerFiveElementChartModal({
  customer,
  saving,
  onClose,
  onSave,
}: CustomerFiveElementChartModalProps) {
  const [chart, setChart] = useState<MemberFiveElementChart>(() =>
    cloneChart(customer.five_element_chart)
  )

  useEffect(() => {
    const next = cloneChart(customer.five_element_chart)
    const nextMissing = deriveMissingElements(next.natal, next.composite)
    // 已有本命／綜合且平衡空白時，預設帶入缺@中
    if (
      next.balance.length === 0 &&
      nextMissing.length > 0 &&
      nextMissing.length < FIVE_ELEMENTS.length
    ) {
      next.balance = defaultBalanceFromMissing(nextMissing)
    }
    setChart(next)
  }, [customer])

  const missing = useMemo(
    () => deriveMissingElements(chart.natal, chart.composite),
    [chart.natal, chart.composite]
  )

  const applyNatal = (natal: FiveElement[]) => {
    setChart((prev) => {
      const next = { ...prev, natal }
      const nextMissing = deriveMissingElements(natal, prev.composite)
      if (
        prev.balance.length === 0 &&
        nextMissing.length > 0 &&
        nextMissing.length < FIVE_ELEMENTS.length
      ) {
        return { ...next, balance: defaultBalanceFromMissing(nextMissing) }
      }
      return next
    })
  }

  const applyComposite = (composite: FiveElement[]) => {
    setChart((prev) => {
      const next = { ...prev, composite }
      const nextMissing = deriveMissingElements(prev.natal, composite)
      if (
        prev.balance.length === 0 &&
        nextMissing.length > 0 &&
        nextMissing.length < FIVE_ELEMENTS.length
      ) {
        return { ...next, balance: defaultBalanceFromMissing(nextMissing) }
      }
      return next
    })
  }

  const handleSeedBalance = () => {
    if (missing.length === 0) return
    setChart((prev) => ({
      ...prev,
      balance: defaultBalanceFromMissing(missing),
    }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="five-element-chart-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
        aria-label="關閉"
      />

      <GlassPanel className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="five-element-chart-title"
              className="font-display text-lg text-amber-glow"
            >
              五行命盤
            </h2>
            <p className="mt-1 text-sm text-white/55">
              {customer.real_name} · {formatPhoneDisplay(customer.phone)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white disabled:opacity-40"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <AdminChartTrioPicker
            label="本命"
            value={chart.natal}
            onChange={applyNatal}
          />
          <AdminChartTrioPicker
            label="綜合"
            value={chart.composite}
            onChange={applyComposite}
          />

          <div>
            <p className="mb-2 text-xs text-white/50">缺（自動）</p>
            <div className="flex flex-wrap gap-2">
              {missing.length === 0 ? (
                <span className="text-xs text-white/35">
                  {chart.natal.length === 0 && chart.composite.length === 0
                    ? '請先選本命／綜合'
                    : '無缺'}
                </span>
              ) : (
                FIVE_ELEMENTS.filter((el) => missing.includes(el)).map((el) => (
                  <span
                    key={el}
                    className="flex h-9 min-w-9 items-center justify-center rounded-full border border-sky-400/35 bg-sky-400/10 px-3 text-sm text-sky-200"
                  >
                    {el}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <AdminWeightedFiveElementsPicker
              label="平衡（補缺）"
              value={chart.balance}
              onChange={(balance) => setChart((prev) => ({ ...prev, balance }))}
            />
            {missing.length > 0 && (
              <button
                type="button"
                onClick={handleSeedBalance}
                className="text-[11px] text-white/40 underline-offset-2 transition hover:text-amber-glow hover:underline"
              >
                依缺帶入平衡
              </button>
            )}
          </div>

          <AdminWeightedFiveElementsPicker
            label="降（減旺）"
            value={chart.reduce}
            onChange={(reduce) => setChart((prev) => ({ ...prev, reduce }))}
          />

          <div>
            <label
              htmlFor="five-element-note"
              className="mb-2 block text-xs text-white/50"
            >
              備註
            </label>
            <textarea
              id="five-element-note"
              value={chart.note}
              onChange={(e) =>
                setChart((prev) => ({ ...prev, note: e.target.value }))
              }
              rows={3}
              className="input-field min-h-[5rem] resize-y"
              placeholder="選填"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void onSave(chart)}
            disabled={saving}
            className="rounded-lg border border-amber-glow/50 bg-amber-glow/15 px-4 py-2 text-sm text-amber-glow transition hover:bg-amber-glow/25 disabled:opacity-50"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
