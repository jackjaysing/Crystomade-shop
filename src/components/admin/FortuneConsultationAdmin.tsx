import { useCallback, useEffect, useState } from 'react'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import {
  deleteFortuneConsultation,
  fetchAllFortuneConsultationsAdmin,
  updateFortuneConsultationAdmin,
} from '../../lib/api/fortuneConsultation'
import type { FortuneConsultationRequest } from '../../lib/types'
import { useAdminSession } from '../../hooks/useAdminSession'
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

function formatFee(fee: number | null): string {
  if (fee == null) return '未填寫'
  return `NT$ ${fee.toLocaleString()}`
}

const MAX_ADMIN_NOTES_LEN = 500

interface FortuneConsultationAdminProps {
  enabled: boolean
  reloadSignal?: number
}

/** 後台：命理諮詢列表 */
export function FortuneConsultationAdmin({
  enabled,
  reloadSignal = 0,
}: FortuneConsultationAdminProps) {
  const { isSuperAdmin } = useAdminSession()
  const [rows, setRows] = useState<FortuneConsultationRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({})
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})

  const syncDrafts = useCallback((data: FortuneConsultationRequest[]) => {
    setFeeDrafts(
      Object.fromEntries(
        data.map((row) => [
          row.id,
          row.estimated_fee != null ? String(row.estimated_fee) : '',
        ])
      )
    )
    setNotesDrafts(
      Object.fromEntries(data.map((row) => [row.id, row.admin_notes ?? '']))
    )
  }, [])

  const patchRow = useCallback((updated: FortuneConsultationRequest) => {
    setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    setFeeDrafts((prev) => ({
      ...prev,
      [updated.id]:
        updated.estimated_fee != null ? String(updated.estimated_fee) : '',
    }))
    setNotesDrafts((prev) => ({
      ...prev,
      [updated.id]: updated.admin_notes ?? '',
    }))
  }, [])

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchAllFortuneConsultationsAdmin()
      setRows(data)
      syncDrafts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled, syncDrafts])

  useEffect(() => {
    void reload()
  }, [reload, reloadSignal])

  const runUpdate = async (
    row: FortuneConsultationRequest,
    patch: Parameters<typeof updateFortuneConsultationAdmin>[1],
    successMessage: string
  ) => {
    setBusyId(row.id)
    setMessage('')
    try {
      const updated = await updateFortuneConsultationAdmin(row.id, patch)
      patchRow(updated)
      setMessage(successMessage)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveFee = async (row: FortuneConsultationRequest) => {
    const raw = (feeDrafts[row.id] ?? '').trim()
    const fee = raw === '' ? null : Math.max(0, Math.floor(Number(raw) || 0))
    await runUpdate(row, { estimatedFee: fee }, '已儲存預估諮詢費用')
  }

  const handleSaveNotes = async (row: FortuneConsultationRequest) => {
    const notes = (notesDrafts[row.id] ?? '').trim()
    await runUpdate(
      row,
      { adminNotes: notes === '' ? null : notes },
      '已儲存命理師備註'
    )
  }

  const handleToggleContacted = async (row: FortuneConsultationRequest) => {
    const next = !row.contacted_at
    await runUpdate(
      row,
      { contacted: next },
      next ? '已標記為已聯繫' : '已取消已聯繫'
    )
  }

  const handleTogglePaid = async (row: FortuneConsultationRequest) => {
    const next = !row.paid_at
    await runUpdate(row, { paid: next }, next ? '已標記為已付款' : '已取消已付款')
  }

  const handleDelete = async (row: FortuneConsultationRequest) => {
    const preview =
      row.question.length > 40 ? `${row.question.slice(0, 40)}…` : row.question
    if (!confirm(`確定刪除此諮詢？\n「${preview}」`)) return

    setBusyId(row.id)
    setMessage('')
    try {
      await deleteFortuneConsultation(row.id)
      setRows((prev) => prev.filter((item) => item.id !== row.id))
      setFeeDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setNotesDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage('已刪除諮詢')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
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
      {message && (
        <p
          className={`text-sm ${
            message.startsWith('已')
              ? 'text-emerald-300/90'
              : 'text-amber-glow/90'
          }`}
          role="status"
        >
          {message}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <GlassPanel className="p-8 text-center text-sm text-white/50">
          目前尚無命理諮詢留言
        </GlassPanel>
      )}

      <ul className="space-y-3">
        {rows.map((row) => {
          const busy = busyId === row.id
          const contacted = !!row.contacted_at
          const paid = !!row.paid_at
          return (
            <li key={row.id}>
              <GlassPanel className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {contacted && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] text-emerald-300/90">
                      已聯繫
                    </span>
                  )}
                  {paid && (
                    <span className="rounded-full border border-amber-glow/30 bg-amber-glow/10 px-2.5 py-0.5 text-[11px] text-amber-glow/90">
                      已付款
                    </span>
                  )}
                  {row.estimated_fee != null && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/60">
                      預估 {formatFee(row.estimated_fee)}
                    </span>
                  )}
                  {row.admin_notes && (
                    <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-0.5 text-[11px] text-violet-200/90">
                      有備註
                    </span>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                  {row.question}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/40">
                  <span className="text-amber-glow/80">{contactLabel(row)}</span>
                  <span className="text-sky-300/90">Line：{row.line_id}</span>
                  {row.member_phone && (
                    <span>{formatPhoneDisplay(row.member_phone)}</span>
                  )}
                  <span>{formatDateTime(row.created_at)}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/8 pt-4">
                  <div className="min-w-[12rem] flex-1">
                    <label
                      htmlFor={`fortune-fee-${row.id}`}
                      className="mb-1.5 block text-xs text-white/50"
                    >
                      預估諮詢費用（NT$）
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        id={`fortune-fee-${row.id}`}
                        type="number"
                        min={0}
                        step={1}
                        value={feeDrafts[row.id] ?? ''}
                        onChange={(e) =>
                          setFeeDrafts((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        placeholder="例如 1500"
                        disabled={busy}
                        className="w-full min-w-[8rem] max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-amber-glow/40 focus:outline-none disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSaveFee(row)}
                        className="rounded-lg border border-amber-glow/35 bg-amber-glow/10 px-3 py-2 text-xs text-amber-glow transition hover:bg-amber-glow/15 disabled:opacity-50"
                      >
                        儲存費用
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleContacted(row)}
                      className={`rounded-lg border px-3 py-2 text-xs transition disabled:opacity-50 ${
                        contacted
                          ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                          : 'border-white/15 text-white/65 hover:border-emerald-400/30 hover:text-emerald-300'
                      }`}
                    >
                      {contacted ? '已聯繫' : '標記已聯繫'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTogglePaid(row)}
                      className={`rounded-lg border px-3 py-2 text-xs transition disabled:opacity-50 ${
                        paid
                          ? 'border-amber-glow/45 bg-amber-glow/15 text-amber-glow'
                          : 'border-white/15 text-white/65 hover:border-amber-glow/35 hover:text-amber-glow'
                      }`}
                    >
                      {paid ? '已付款' : '標記已付款'}
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(row)}
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300/80 transition hover:border-red-400/40 disabled:opacity-50"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-white/8 pt-4">
                  <label
                    htmlFor={`fortune-notes-${row.id}`}
                    className="mb-1.5 block text-xs text-white/50"
                  >
                    命理師備註（僅後台可見）
                  </label>
                  <textarea
                    id={`fortune-notes-${row.id}`}
                    rows={4}
                    maxLength={MAX_ADMIN_NOTES_LEN}
                    value={notesDrafts[row.id] ?? ''}
                    onChange={(e) =>
                      setNotesDrafts((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    placeholder="記錄諮詢重點、回覆內容、後續追蹤事項…"
                    disabled={busy}
                    className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/25 focus:border-amber-glow/40 focus:outline-none disabled:opacity-50"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-white/30">
                      {(notesDrafts[row.id] ?? '').length}/{MAX_ADMIN_NOTES_LEN}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSaveNotes(row)}
                      className="rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-xs text-violet-200/90 transition hover:bg-violet-300/15 disabled:opacity-50"
                    >
                      儲存備註
                    </button>
                  </div>
                </div>
              </GlassPanel>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
