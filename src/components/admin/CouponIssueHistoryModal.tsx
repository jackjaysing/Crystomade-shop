import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { fetchAdminCouponIssues } from '../../lib/api/coupons'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import type { AdminCouponIssueRecord, MemberCouponStatus } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface CouponIssueHistoryModalProps {
  couponId: string
  couponTitle: string
  onClose: () => void
}

const STATUS_LABELS: Record<MemberCouponStatus, string> = {
  available: '未使用',
  used: '已使用',
  expired: '已過期',
  in_cart: '購物車中',
}

/** 後台：查某一張券實際發到哪些會員 */
export function CouponIssueHistoryModal({
  couponId,
  couponTitle,
  onClose,
}: CouponIssueHistoryModalProps) {
  const [rows, setRows] = useState<AdminCouponIssueRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void fetchAdminCouponIssues(couponId)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([])
          setError(err instanceof Error ? err.message : '載入發放紀錄失敗')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [couponId])

  const availableCount = rows.filter((r) => r.status === 'available').length
  const usedCount = rows.filter((r) => r.status === 'used').length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coupon-issue-history-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="關閉發放紀錄"
      />
      <GlassPanel className="relative z-10 flex max-h-[min(88vh,40rem)] w-full max-w-lg flex-col p-0">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3
              id="coupon-issue-history-title"
              className="font-display text-xl text-white"
            >
              發放紀錄
            </h3>
            <p className="mt-1 truncate text-sm text-white/50">{couponTitle}</p>
            {!loading && !error && (
              <p className="mt-1 text-xs text-white/40">
                共 {rows.length} 張
                {rows.length > 0 &&
                  ` · 未使用 ${availableCount} · 已使用 ${usedCount}`}
              </p>
            )}
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
          ) : rows.length === 0 ? (
            <p className="text-sm text-white/45">
              尚無發放紀錄。發放成功後，會員帳戶會出現此券，並顯示在此列表。
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/85">{row.member_name}</p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {row.member_phone
                        ? formatPhoneDisplay(row.member_phone)
                        : '—'}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      發放 {new Date(row.issued_at).toLocaleString('zh-TW')}
                      {row.expires_at
                        ? ` · 效期至 ${new Date(row.expires_at).toLocaleDateString('zh-TW')}`
                        : ''}
                      {row.used_at
                        ? ` · 使用於 ${new Date(row.used_at).toLocaleString('zh-TW')}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                      row.status === 'available'
                        ? 'border-emerald-400/35 text-emerald-300'
                        : row.status === 'used'
                          ? 'border-white/20 text-white/55'
                          : row.status === 'in_cart'
                            ? 'border-amber-glow/35 text-amber-glow'
                            : 'border-red-400/30 text-red-300'
                    }`}
                  >
                    {STATUS_LABELS[row.status] ?? row.status}
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
