import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminUpdateMemberPoints,
  fetchGuestCustomers,
  fetchRegisteredCustomers,
  formatPhoneDisplay,
} from '../../lib/api/adminCustomers'
import type { AdminGuestCustomer, AdminRegisteredCustomer } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

type CustomerView = 'registered' | 'guest'

interface CustomerAdminProps {
  enabled?: boolean
}

/** 後台：客戶資料（已註冊／未註冊） */
export function CustomerAdmin({ enabled = true }: CustomerAdminProps) {
  const [view, setView] = useState<CustomerView>('registered')
  const [registered, setRegistered] = useState<AdminRegisteredCustomer[]>([])
  const [guests, setGuests] = useState<AdminGuestCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<AdminRegisteredCustomer | null>(null)
  const [editPoints, setEditPoints] = useState(0)
  const [editReason, setEditReason] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setMessage('')
    try {
      const [reg, gst] = await Promise.all([
        fetchRegisteredCustomers(),
        fetchGuestCustomers(),
      ])
      setRegistered(reg)
      setGuests(gst)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredRegistered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return registered
    return registered.filter(
      (c) =>
        c.real_name.toLowerCase().includes(q) ||
        formatPhoneDisplay(c.phone).includes(q) ||
        c.phone.includes(q)
    )
  }, [registered, search])

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return guests
    return guests.filter(
      (c) =>
        c.buyer_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.line_name?.toLowerCase().includes(q) ?? false)
    )
  }, [guests, search])

  const openEdit = (customer: AdminRegisteredCustomer) => {
    setEditing(customer)
    setEditPoints(customer.points)
    setEditReason('')
  }

  const handleSavePoints = async () => {
    if (!editing) return
    setSaving(true)
    setMessage('')
    try {
      await adminUpdateMemberPoints(editing.id, editPoints, editReason)
      setMessage(`已更新 ${editing.real_name} 的點數`)
      setEditing(null)
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const list = view === 'registered' ? filteredRegistered : filteredGuests
  const countLabel =
    view === 'registered'
      ? `已註冊 ${registered.length} 人`
      : `未註冊 ${guests.length} 人`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('registered')}
            className={`rounded-full border px-4 py-2 text-sm tracking-wide transition ${
              view === 'registered'
                ? 'border-amber-glow/60 bg-amber-glow/15 text-amber-glow'
                : 'border-white/15 text-white/55 hover:border-amber-glow/40'
            }`}
          >
            已註冊會員 ({registered.length})
          </button>
          <button
            type="button"
            onClick={() => setView('guest')}
            className={`rounded-full border px-4 py-2 text-sm tracking-wide transition ${
              view === 'guest'
                ? 'border-amber-glow/60 bg-amber-glow/15 text-amber-glow'
                : 'border-white/15 text-white/55 hover:border-amber-glow/40'
            }`}
          >
            未註冊客戶 ({guests.length})
          </button>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-50"
        >
          重新整理
        </button>
      </div>

      <GlassPanel className="p-4 sm:p-5">
        <input
          type="search"
          placeholder="搜尋姓名、電話、Line…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
        <p className="mt-2 text-xs text-white/40">{countLabel}</p>
      </GlassPanel>

      {message && (
        <p
          className={`text-sm ${
            message.includes('已更新') ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-center text-sm text-white/40">載入中…</p>
      ) : list.length === 0 ? (
        <GlassPanel className="p-10 text-center text-sm text-white/40">
          {view === 'registered' ? '尚無註冊會員' : '尚無訪客訂單客戶'}
        </GlassPanel>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-xs tracking-wider text-white/45">
                {view === 'registered' ? (
                  <>
                    <th className="px-4 py-3 font-medium">姓名</th>
                    <th className="px-4 py-3 font-medium">電話</th>
                    <th className="px-4 py-3 font-medium">生日</th>
                    <th className="px-4 py-3 font-medium">點數</th>
                    <th className="px-4 py-3 font-medium">訂單</th>
                    <th className="px-4 py-3 font-medium">註冊日</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-medium">姓名</th>
                    <th className="px-4 py-3 font-medium">電話</th>
                    <th className="px-4 py-3 font-medium">Line</th>
                    <th className="px-4 py-3 font-medium">訂單數</th>
                    <th className="px-4 py-3 font-medium">消費總額</th>
                    <th className="px-4 py-3 font-medium">最近訂單</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {view === 'registered'
                ? filteredRegistered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-white/90">{c.real_name}</td>
                      <td className="px-4 py-3 text-white/70">
                        {formatPhoneDisplay(c.phone)}
                      </td>
                      <td className="px-4 py-3 text-white/60">{c.birthday}</td>
                      <td className="px-4 py-3 font-medium text-amber-glow">
                        {c.points}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {c.order_count} 筆
                        {c.total_spent > 0 && (
                          <span className="block text-xs text-white/40">
                            NT$ {c.total_spent.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50">
                        {new Date(c.created_at).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="rounded border border-amber-glow/35 px-3 py-1 text-xs text-amber-glow transition hover:bg-amber-glow/10"
                        >
                          編輯點數
                        </button>
                      </td>
                    </tr>
                  ))
                : filteredGuests.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-white/90">{c.buyer_name}</td>
                      <td className="px-4 py-3 text-white/70">{c.phone}</td>
                      <td className="px-4 py-3 text-white/50">
                        {c.line_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-white/60">{c.order_count}</td>
                      <td className="px-4 py-3 text-white/70">
                        NT$ {c.total_spent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50">
                        {c.last_order_at
                          ? new Date(c.last_order_at).toLocaleString('zh-TW')
                          : '—'}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'guest' && guests.length > 0 && (
        <p className="text-xs text-white/35">
          未註冊客戶為訪客下單紀錄（無會員帳號），依電話彙總；若已註冊同號碼則僅顯示於「已註冊會員」。
        </p>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm">
          <GlassPanel className="w-full max-w-md p-6 sm:p-8">
            <h3 className="font-display text-xl text-white">調整會員點數</h3>
            <p className="mt-1 text-sm text-white/50">
              {editing.real_name} · {formatPhoneDisplay(editing.phone)}
            </p>
            <p className="mt-2 text-xs text-white/40">
              目前點數：{editing.points}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/50">新點數 *</label>
                <input
                  type="number"
                  min={0}
                  value={editPoints}
                  onChange={(e) => setEditPoints(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  備註（寫入點數紀錄）
                </label>
                <input
                  placeholder="例：活動補點、客服補償"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-white/60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSavePoints()}
                className="flex-1 rounded-lg bg-amber-glow/90 py-2.5 text-sm font-medium text-void disabled:opacity-50"
              >
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  )
}
