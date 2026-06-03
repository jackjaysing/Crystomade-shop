import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createRaffle,
  deleteRaffle,
  drawRaffleWinner,
  fetchAllRaffles,
  fetchRaffleEntries,
  updateRaffle,
  uploadRafflePrizeImage,
} from '../../lib/api/raffles'
import { RAFFLE_STATUS_LABELS } from '../../constants/raffles'
import type { RaffleFormData, RaffleWithMeta } from '../../lib/types'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import { GlassPanel } from '../ui/GlassPanel'

const emptyForm: RaffleFormData = {
  title: '',
  description: '',
  registration_deadline: '',
  is_active: true,
  prize_title: '',
  prize_gift_description: '',
  prize_image_url: null,
}

function toDatetimeLocalValue(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalValue(value: string): string {
  if (!value) return ''
  return new Date(value).toISOString()
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

interface RaffleAdminProps {
  enabled?: boolean
}

/** 後台：抽獎活動管理 */
export function RaffleAdmin({ enabled = true }: RaffleAdminProps) {
  const [raffles, setRaffles] = useState<RaffleWithMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<RaffleFormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [entriesRaffleId, setEntriesRaffleId] = useState<string | null>(null)
  const [entries, setEntries] = useState<
    Array<{ id: string; real_name: string; phone: string; entered_at: string }>
  >([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [prizeImageFile, setPrizeImageFile] = useState<File | null>(null)
  const [prizeImagePreview, setPrizeImagePreview] = useState<string | null>(null)
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setMessage('')
    try {
      setRaffles(await fetchAllRaffles())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setEditingCouponId(null)
    setPrizeImageFile(null)
    setPrizeImagePreview(null)
  }

  const loadEdit = (r: RaffleWithMeta) => {
    setEditingId(r.id)
    setEditingCouponId(r.prize_coupon_id)
    setPrizeImageFile(null)
    setPrizeImagePreview(r.prize_image_url)
    setForm({
      title: r.title,
      description: r.description,
      registration_deadline: toDatetimeLocalValue(r.registration_deadline),
      is_active: r.is_active,
      prize_title: r.prize_title ?? '',
      prize_gift_description: r.prize_gift_description ?? '',
      prize_image_url: r.prize_image_url,
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setMessage('請填寫活動名稱')
      return
    }
    if (!form.registration_deadline) {
      setMessage('請設定報名截止時間')
      return
    }

    if (form.prize_title.trim() && !form.prize_gift_description.trim()) {
      setMessage('請填寫禮物券說明')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      let imageUrl = form.prize_image_url
      if (prizeImageFile) {
        imageUrl = await uploadRafflePrizeImage(prizeImageFile)
      }

      const payload: RaffleFormData = {
        ...form,
        registration_deadline: fromDatetimeLocalValue(form.registration_deadline),
        prize_image_url: imageUrl,
      }

      if (editingId) {
        await updateRaffle(editingId, payload, editingCouponId)
        setMessage('已更新抽獎活動')
      } else {
        await createRaffle(payload)
        setMessage('已新增抽獎活動')
      }
      resetForm()
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (r: RaffleWithMeta) => {
    if (!confirm(`確定刪除抽獎「${r.title}」？\n\n報名紀錄將一併刪除。`)) return
    try {
      await deleteRaffle(r.id)
      setMessage('已刪除')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  const handleDraw = async (r: RaffleWithMeta) => {
    if (
      !confirm(
        `確定為「${r.title}」執行抽獎？\n\n將從 ${r.entry_count} 位報名者中隨機抽出 1 名。`
      )
    ) {
      return
    }
    try {
      await drawRaffleWinner(r.id)
      setMessage('已完成抽獎')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '抽獎失敗')
    }
  }

  const openEntries = async (raffleId: string) => {
    setEntriesRaffleId(raffleId)
    setEntriesLoading(true)
    try {
      const rows = await fetchRaffleEntries(raffleId)
      setEntries(
        rows.map((e) => ({
          id: e.id,
          real_name: e.real_name,
          phone: e.phone,
          entered_at: e.entered_at,
        }))
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入報名名單失敗')
      setEntriesRaffleId(null)
    } finally {
      setEntriesLoading(false)
    }
  }

  const isRegistrationOpen = (r: RaffleWithMeta) =>
    r.status === 'open' && new Date(r.registration_deadline) > new Date()

  return (
    <div className="space-y-8">
      {message && (
        <p className="text-sm text-amber-glow/90" role="status">
          {message}
        </p>
      )}

      <GlassPanel className="p-6">
        <h3 className="font-display text-lg text-white">
          {editingId ? '編輯抽獎活動' : '新增抽獎活動'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="活動名稱 *"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-amber-glow/50"
          />
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="活動說明"
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-amber-glow/50"
          />
          <div>
            <p className="mb-1 text-xs text-white/50">報名截止時間 *</p>
            <input
              type="datetime-local"
              value={form.registration_deadline}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  registration_deadline: e.target.value,
                }))
              }
              className="w-full max-w-xs rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-amber-glow/50"
            />
            <p className="mt-1 text-xs text-white/35">
              截止後系統將自動從報名者中隨機抽出 1 名，並發放禮物券至得主帳戶
            </p>
          </div>

          <div className="rounded-xl border border-amber-glow/20 bg-amber-glow/5 p-4">
            <p className="mb-3 text-sm font-medium text-amber-glow/90">獎品禮物券</p>
            <input
              type="text"
              value={form.prize_title}
              onChange={(e) =>
                setForm((f) => ({ ...f, prize_title: e.target.value }))
              }
              placeholder="禮物名稱（留空則無獎品券）"
              className="mb-3 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-amber-glow/50"
            />
            <textarea
              value={form.prize_gift_description}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  prize_gift_description: e.target.value,
                }))
              }
              placeholder="禮物說明（得主兌換時顯示）"
              rows={2}
              className="mb-3 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-amber-glow/50"
            />
            <div className="flex flex-wrap items-start gap-4">
              {(prizeImagePreview || form.prize_image_url) && (
                <img
                  src={prizeImagePreview ?? form.prize_image_url ?? ''}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <label className="cursor-pointer rounded-lg border border-dashed border-white/25 px-4 py-3 text-sm text-white/50 hover:border-amber-glow/40 hover:text-white/70">
                上傳禮物照片
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPrizeImageFile(file)
                    setPrizeImagePreview(URL.createObjectURL(file))
                  }}
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="rounded border-white/30"
            />
            上架顯示於前台
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-glow/20 px-5 py-2 text-sm text-amber-glow transition hover:bg-amber-glow/30 disabled:opacity-50"
            >
              {submitting ? '儲存中…' : editingId ? '儲存變更' : '新增活動'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-white/20 px-5 py-2 text-sm text-white/60 hover:text-white"
              >
                取消編輯
              </button>
            )}
          </div>
        </form>
      </GlassPanel>

      <section>
        <h3 className="font-display text-xl text-white">抽獎活動列表</h3>
        {loading ? (
          <p className="mt-4 text-sm text-white/40">載入中…</p>
        ) : raffles.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">尚無抽獎活動</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {raffles.map((r) => (
              <li key={r.id}>
                <GlassPanel className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{r.title}</p>
                      {r.description && (
                        <p className="mt-1 text-sm text-white/50">{r.description}</p>
                      )}
                      <p className="mt-2 text-xs text-white/40">
                        截止：{formatDeadline(r.registration_deadline)} ·{' '}
                        {RAFFLE_STATUS_LABELS[r.status]} · 報名 {r.entry_count} 人
                      </p>
                      {r.status === 'drawn' && (
                        <p className="mt-1 text-xs text-emerald-300/80">
                          得主：
                          {r.winner_name
                            ? r.winner_name
                            : r.entry_count === 0
                              ? '無人報名'
                              : '—'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void openEntries(r.id)}
                        className="rounded border border-white/20 px-3 py-1 text-xs text-white/70 hover:text-white"
                      >
                        報名名單
                      </button>
                      {r.status === 'open' &&
                        !isRegistrationOpen(r) &&
                        r.entry_count > 0 && (
                          <button
                            type="button"
                            onClick={() => void handleDraw(r)}
                            className="rounded border border-amber-glow/40 px-3 py-1 text-xs text-amber-glow hover:bg-amber-glow/10"
                          >
                            立即抽獎
                          </button>
                        )}
                      {r.status === 'open' && isRegistrationOpen(r) && (
                        <button
                          type="button"
                          onClick={() => loadEdit(r)}
                          className="rounded border border-white/20 px-3 py-1 text-xs text-white/70 hover:text-white"
                        >
                          編輯
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(r)}
                        className="rounded border border-red-400/30 px-3 py-1 text-xs text-red-300/80 hover:bg-red-400/10"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </GlassPanel>
              </li>
            ))}
          </ul>
        )}
      </section>

      {entriesRaffleId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <GlassPanel className="max-h-[80vh] w-full max-w-md overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-white">報名名單</h3>
              <button
                type="button"
                onClick={() => setEntriesRaffleId(null)}
                className="text-white/50 hover:text-white"
              >
                關閉
              </button>
            </div>
            {entriesLoading ? (
              <p className="text-sm text-white/40">載入中…</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-white/40">尚無報名</p>
            ) : (
              <ul className="space-y-2">
                {entries.map((e, i) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80"
                  >
                    {i + 1}. {e.real_name || '—'} ·{' '}
                    {formatPhoneDisplay(e.phone)}
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      )}
    </div>
  )
}
