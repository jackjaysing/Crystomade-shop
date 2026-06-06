import { useCallback, useEffect, useState } from 'react'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import {
  deleteFortuneConsultation,
  fetchAllFortuneConsultationsAdmin,
} from '../../lib/api/fortuneConsultation'
import type { FortuneConsultationRequest } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function contactLabel(row: FortuneConsultationRequest): string {
  if (row.member_real_name) return row.member_real_name
  if (row.display_name) return row.display_name
  return '訪客'
}

interface FortuneConsultationAdminProps {
  enabled: boolean
}

/** 後台：命理諮詢列表 */
export function FortuneConsultationAdmin({ enabled }: FortuneConsultationAdminProps) {
  const [rows, setRows] = useState<FortuneConsultationRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchAllFortuneConsultationsAdmin()
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleDelete = async (row: FortuneConsultationRequest) => {
    if (!confirm(`確定刪除此諮詢？\n「${row.question.slice(0, 40)}…」`)) return
    setBusyId(row.id)
    try {
      await deleteFortuneConsultation(row.id)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/45">
          {loading ? '載入中…' : `共 ${rows.length} 則諮詢`}
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="text-sm text-white/45 transition hover:text-amber-glow disabled:opacity-50"
        >
          重新整理
        </button>
      </div>

      {error && <p className="text-sm text-amber-glow/90">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <GlassPanel className="p-8 text-center text-sm text-white/50">
          目前尚無命理諮詢留言
        </GlassPanel>
      )}

      <ul className="space-y-3">
        {rows.map((row) => {
          const busy = busyId === row.id
          return (
            <li key={row.id}>
              <GlassPanel className="p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                  {row.question}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/40">
                    <span className="text-amber-glow/80">{contactLabel(row)}</span>
                    <span className="text-sky-300/90">Line：{row.line_id}</span>
                    {row.member_phone && (
                      <span>{formatPhoneDisplay(row.member_phone)}</span>
                    )}
                    <span>{formatDateTime(row.created_at)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(row)}
                    className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-300/80 transition hover:border-red-400/40 disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>
              </GlassPanel>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
