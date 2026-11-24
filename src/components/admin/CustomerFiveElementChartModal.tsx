import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  FIVE_ELEMENTS,
  type FiveElement,
  type MemberFiveElementChart,
  type WeightedElement,
} from '../../constants/fiveElements'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import {
  EMPTY_MEMBER_FIVE_ELEMENT_CHART,
  deriveMissingElements,
} from '../../lib/memberFiveElementChart'
import type { AdminRegisteredCustomer } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { AdminChartTrioPicker } from './AdminChartTrioPicker'
import { AdminFiveElementsPicker } from './AdminFiveElementsPicker'
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
  if (!chart) return { ...EMPTY_MEMBER_FIVE_ELEMENT_CHART, missing: [] }
  return {
    natal: [...chart.natal],
    composite: [...chart.composite],
    missing: [...(chart.missing ?? [])],
    balance: chart.balance.map((item) => ({ ...item })),
    reduce: chart.reduce.map((item) => ({ ...item })),
    note: chart.note,
  }
}

function defaultBalanceFromMissing(missing: FiveElement[]): WeightedElement[] {
  return missing.map((element) => ({ element, intensity: '中' as const }))
}

function withAutoMissing(chart: MemberFiveElementChart): MemberFiveElementChart {
  const auto = deriveMissingElements(chart.natal, chart.composite)
  const next = { ...chart, missing: auto }
  if (
    next.balance.length === 0 &&
    auto.length > 0 &&
    auto.length < FIVE_ELEMENTS.length
  ) {
    next.balance = defaultBalanceFromMissing(auto)
  }
  return next
}

/** 後台：編輯會員五行命盤 */
export function CustomerFiveElementChartModal({
  customer,
  saving,
  onClose,
  onSave,
}: CustomerFiveElementChartModalProps) {
  const [chart, setChart] = useState<MemberFiveElementChart>(() => {
    const cloned = cloneChart(customer.five_element_chart)
    if (
      cloned.missing.length === 0 &&
      (cloned.natal.length > 0 || cloned.composite.length > 0)
    ) {
      return withAutoMissing(cloned)
    }
    return cloned
  })

  useEffect(() => {
    const cloned = cloneChart(customer.five_element_chart)
    if (
      cloned.missing.length === 0 &&
      (cloned.natal.length > 0 || cloned.composite.length > 0)
    ) {
      setChart(withAutoMissing(cloned))
      return
    }
    if (
      cloned.balance.length === 0 &&
      cloned.missing.length > 0 &&
      cloned.missing.length < FIVE_ELEMENTS.length
    ) {
      cloned.balance = defaultBalanceFromMissing(cloned.missing)
    }
    setChart(cloned)
  }, [customer])

  const autoMissing = useMemo(
    () => deriveMissingElements(chart.natal, chart.composite),
    [chart.natal, chart.composite]
  )

  const applyNatal = (natal: FiveElement[]) => {
    setChart((prev) => withAutoMissing({ ...prev, natal }))
  }

  const applyComposite = (composite: FiveElement[]) => {
    setChart((prev) => withAutoMissing({ ...prev, composite }))
  }

  const handleResyncMissing = () => {
    setChart((prev) => ({
      ...prev,
      missing: deriveMissingElements(prev.natal, prev.composite),
    }))
  }

  const handleSeedBalance = () => {
    if (chart.missing.length === 0) return
    setChart((prev) => ({
      ...prev,
      balance: defaultBalanceFromMissing(prev.missing),
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

          <div className="space-y-2">
            <AdminFiveElementsPicker
              label="缺"
              hint="改本命／綜合會自動帶入；也可再點選補充或取消"
              accent="sky"
              value={chart.missing}
              onChange={(missing) =>
                setChart((prev) => ({ ...prev, missing }))
              }
            />
            {(chart.natal.length > 0 || chart.composite.length > 0) && (
              <button
                type="button"
                onClick={handleResyncMissing}
                className="text-[11px] text-white/40 underline-offset-2 transition hover:text-sky-200 hover:underline"
              >
                依本命／綜合重算缺
                {autoMissing.length > 0
                  ? `（${autoMissing.join('')}）`
                  : '（無缺）'}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <AdminWeightedFiveElementsPicker
              label="平衡（補缺）"
              value={chart.balance}
              onChange={(balance) => setChart((prev) => ({ ...prev, balance }))}
            />
            {chart.missing.length > 0 && (
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
