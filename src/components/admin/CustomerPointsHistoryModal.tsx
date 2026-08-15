import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { fetchPointsHistory } from '../../lib/api/members'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import type { AdminRegisteredCustomer, PointsHistoryEntry } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface CustomerPointsHistoryModalProps {
  customer: AdminRegisteredCustomer
  onClose: () => void
}

/** 後台：單一會員點數流水 */
export function CustomerPointsHistoryModal({
  customer,
  onClose,
}: CustomerPointsHistoryModalProps) {
  const [entries, setEntries] = useState<PointsHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void fetchPointsHistory(customer.id, 200)
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch((err) => {
        if (!cancelled) {
          setEntries([])
          setError(err instanceof Error ? err.message : '載入點數紀錄失敗')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customer.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-points-history-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="關閉點數紀錄"
      />
      <GlassPanel className="relative z-10 flex max-h-[min(88vh,40rem)] w-full max-w-lg flex-col p-0">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3
              id="customer-points-history-title"
              className="font-display text-xl text-white"
            >
              點數紀錄
            </h3>
            <p className="mt-1 text-sm text-white/50">
              {customer.real_name} · {formatPhoneDisplay(customer.phone)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              目前點數：
              <span className="ml-1 text-amber-glow">{customer.points}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-amber-glow/50 hover:text-amber-glow"
            aria-label="關閉"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <p className="text-sm text-white/45">載入中…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-white/45">尚無點數變動紀錄</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/85">{entry.description}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {new Date(entry.created_at).toLocaleString('zh-TW')}
                      {entry.order_number ? ` · 訂單 ${entry.order_number}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-white/35">
                      餘額 {entry.balance_after}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      entry.delta >= 0 ? 'text-emerald-400' : 'text-red-300'
                    }`}
                  >
                    {entry.delta >= 0 ? '+' : ''}
                    {entry.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </GlassPanel>
    </div>
  )
}
