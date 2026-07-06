import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminDeleteMember,
  adminUpdateMemberPoints,
  fetchGuestCustomers,
  fetchRegisteredCustomers,
  formatPhoneDisplay,
} from '../../lib/api/adminCustomers'
import { recordAdminActivity } from '../../lib/api/adminActivityLog'
import { fetchAdminCrystalSoulCards, fetchAdminPurchaseMeritCounts } from '../../lib/api/adminGrimoire'
import type { AdminLegacyGrimoireIssueRow } from '../../lib/api/adminGrimoire'
import {
  formatMemberMagicianBookSummary,
  formatMemberMagicianXpBreakdown,
  groupSoulCardsByUser,
  resolvePurchaseMeritByUser,
  summarizeMemberMagician,
} from '../../lib/adminMemberMagician'
import type {
  AdminGuestCustomer,
  AdminRegisteredCustomer,
  CrystalSoulCard,
} from '../../lib/types'
import { useAdminSession } from '../../hooks/useAdminSession'
import { BirthdayMembersPanel } from './BirthdayMembersPanel'
import { DeleteMemberConfirmModal } from './DeleteMemberConfirmModal'
import { LegacyGrimoireIssueModal } from './LegacyGrimoireIssueModal'
import { GlassPanel } from '../ui/GlassPanel'

type CustomerView = 'registered' | 'guest'
type PointsEditMode = 'set' | 'adjust'

function parseNonNegativePointsInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.floor(value))
}

function parseSignedDeltaInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '+') return 0
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return Math.floor(value)
}

interface CustomerAdminProps {
  enabled?: boolean
  /** 遞增時重新載入會員列表（新註冊通知用） */
  reloadSignal?: number
}

/** 後台：客戶資料（已註冊／未註冊） */
export function CustomerAdmin({ enabled = true, reloadSignal = 0 }: CustomerAdminProps) {
  const { isSuperAdmin } = useAdminSession()
  const [view, setView] = useState<CustomerView>('registered')
  const [registered, setRegistered] = useState<AdminRegisteredCustomer[]>([])
  const [guests, setGuests] = useState<AdminGuestCustomer[]>([])
  const [soulCards, setSoulCards] = useState<CrystalSoulCard[]>([])
  const [purchaseMeritByUser, setPurchaseMeritByUser] = useState<Map<string, number>>(
    () => new Map()
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<AdminRegisteredCustomer | null>(null)
  const [pointsEditMode, setPointsEditMode] = useState<PointsEditMode>('set')
  const [editPointsInput, setEditPointsInput] = useState('')
  const [editDeltaInput, setEditDeltaInput] = useState('')
  const [editReason, setEditReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingMember, setDeletingMember] =
    useState<AdminRegisteredCustomer | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [legacyIssueMember, setLegacyIssueMember] =
    useState<AdminRegisteredCustomer | null>(null)

  const reloadMembers = useCallback(async () => {
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

  const reloadSoulCards = useCallback(async () => {
    if (!enabled) return
    try {
      const [cards, meritCounts] = await Promise.all([
        fetchAdminCrystalSoulCards(),
        fetchAdminPurchaseMeritCounts(),
      ])
      setSoulCards(cards)
      setPurchaseMeritByUser(resolvePurchaseMeritByUser(meritCounts, cards))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '靈魂卡載入失敗')
    }
  }, [enabled])

  const handleLegacyGrimoireIssued = useCallback(
    async (member: AdminRegisteredCustomer, rows: AdminLegacyGrimoireIssueRow[]) => {
      await reloadSoulCards()
      const serials = rows
        .map((row) => row.serialNumber)
        .filter((value): value is string => Boolean(value))
      setMessage(
        `已為 ${member.real_name} 補登 ${rows.length} 本魔導書${
          serials.length > 0 ? `（${serials.join('、')}）` : ''
        }`
      )
      void recordAdminActivity({
        action: 'create',
        entityType: 'order',
        entityId: rows[0]?.orderId,
        entityLabel: `${member.real_name} · ${formatPhoneDisplay(member.phone)}`,
        summary: `補登歷史魔導書 ${rows.length} 本：${member.real_name}`,
      })
    },
    [reloadSoulCards]
  )

  const reloadAll = useCallback(async () => {
    await reloadMembers()
    if (view === 'registered') await reloadSoulCards()
  }, [reloadMembers, reloadSoulCards, view])

  useEffect(() => {
    void reloadMembers()
  }, [reloadMembers])

  useEffect(() => {
    if (view === 'registered' && enabled) void reloadSoulCards()
  }, [view, enabled, reloadSoulCards])

  useEffect(() => {
    if (reloadSignal > 0) void reloadAll()
  }, [reloadSignal, reloadAll])

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

  const cardsByUser = useMemo(() => groupSoulCardsByUser(soulCards), [soulCards])

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
    setPointsEditMode('set')
    setEditPointsInput(String(customer.points))
    setEditDeltaInput('')
    setEditReason('')
  }

  const parsedSetPoints = parseNonNegativePointsInput(editPointsInput)
  const parsedDelta = parseSignedDeltaInput(editDeltaInput)

  const resolvedEditPoints = editing
    ? pointsEditMode === 'set'
      ? parsedSetPoints ?? editing.points
      : parsedDelta === null
        ? editing.points
        : Math.max(0, editing.points + parsedDelta)
    : 0

  const handleDeleteMember = async () => {
    if (!deletingMember) return
    setDeleteSubmitting(true)
    setMessage('')
    try {
      await adminDeleteMember(deletingMember.id, {
        realName: deletingMember.real_name,
        phone: deletingMember.phone,
        points: deletingMember.points,
        orderCount: deletingMember.order_count,
      })
      setMessage(`已刪除 ${deletingMember.real_name} 的註冊資料`)
      setDeletingMember(null)
      if (editing?.id === deletingMember.id) setEditing(null)
      await reloadAll()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleSavePoints = async () => {
    if (!editing) return

    if (pointsEditMode === 'set') {
      if (parsedSetPoints === null) {
        setMessage('請輸入有效的點數總數')
        return
      }
    } else if (parsedDelta === null) {
      setMessage('請輸入有效的加減點數')
      return
    } else if (editing.points + parsedDelta < 0) {
      setMessage('加減後點數不可為負數')
      return
    }

    if (resolvedEditPoints === editing.points) {
      setMessage('點數未變更')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      await adminUpdateMemberPoints(editing.id, resolvedEditPoints, editReason, {
        realName: editing.real_name,
        phone: editing.phone,
        previousPoints: editing.points,
      })
      setMessage(`已更新 ${editing.real_name} 的點數`)
      setEditing(null)
      await reloadAll()
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
          onClick={() => void reloadAll()}
          disabled={loading}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-50"
        >
          重新整理
        </button>
      </div>

      {view === 'registered' && (
        <BirthdayMembersPanel
          members={registered}
          soulCards={soulCards}
          purchaseMeritByUser={purchaseMeritByUser}
        />
      )}

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
            message.includes('已更新') || message.includes('已刪除')
              ? 'text-emerald-400'
              : 'text-red-400'
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
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-xs tracking-wider text-white/45">
                {view === 'registered' ? (
                  <>
                    <th className="px-4 py-3 font-medium">姓名</th>
                    <th className="px-4 py-3 font-medium">電話</th>
                    <th className="px-4 py-3 font-medium">生日</th>
                    <th className="px-4 py-3 font-medium">魔法師等級</th>
                    <th className="px-4 py-3 font-medium">修為</th>
                    <th className="px-4 py-3 font-medium">點數</th>
                    <th className="px-4 py-3 font-medium">訂單</th>
                    <th className="px-4 py-3 font-medium">註冊日</th>
                    {isSuperAdmin && (
                      <th className="px-4 py-3 font-medium">操作</th>
                    )}
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
                ? filteredRegistered.map((c) => {
                    const magician = summarizeMemberMagician(
                      c,
                      cardsByUser,
                      soulCards,
                      purchaseMeritByUser
                    )
                    const bookSummary = formatMemberMagicianBookSummary(magician)
                    return (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-white/90">{c.real_name}</td>
                      <td className="px-4 py-3 text-white/70">
                        {formatPhoneDisplay(c.phone)}
                      </td>
                      <td className="px-4 py-3 text-white/60">{c.birthday}</td>
                      <td className="px-4 py-3 text-white/75">
                        <span className="block">{magician.title}</span>
                        <span className="text-xs text-white/40">
                          Lv.{magician.tier} · {magician.starLabel}
                          {bookSummary && ` · ${bookSummary}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-amber-glow/85">
                        <span className="block">{magician.totalXp}</span>
                        {formatMemberMagicianXpBreakdown(magician) && (
                          <span className="block text-xs text-white/40">
                            {formatMemberMagicianXpBreakdown(magician)}
                          </span>
                        )}
                      </td>
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
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setLegacyIssueMember(c)}
                              className="rounded border border-violet-400/35 px-3 py-1 text-xs text-violet-200 transition hover:bg-violet-500/10"
                            >
                              補登魔導書
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="rounded border border-amber-glow/35 px-3 py-1 text-xs text-amber-glow transition hover:bg-amber-glow/10"
                            >
                              編輯點數
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingMember(c)}
                              className="rounded border border-red-400/35 px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
                            >
                              刪除註冊
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    )
                  })
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

      {legacyIssueMember && (
        <LegacyGrimoireIssueModal
          member={legacyIssueMember}
          onClose={() => setLegacyIssueMember(null)}
          onIssued={(rows) => void handleLegacyGrimoireIssued(legacyIssueMember, rows)}
        />
      )}

      {deletingMember && (
        <DeleteMemberConfirmModal
          customer={deletingMember}
          deleting={deleteSubmitting}
          onClose={() => {
            if (!deleteSubmitting) setDeletingMember(null)
          }}
          onConfirm={handleDeleteMember}
        />
      )}

      {isSuperAdmin && editing && (
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
                <p className="mb-2 text-xs text-white/50">調整方式</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPointsEditMode('set')}
                    className={`flex-1 rounded-lg border py-2 text-sm tracking-wide transition ${
                      pointsEditMode === 'set'
                        ? 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
                        : 'border-white/10 text-white/50 hover:text-white/80'
                    }`}
                  >
                    設定總數
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsEditMode('adjust')}
                    className={`flex-1 rounded-lg border py-2 text-sm tracking-wide transition ${
                      pointsEditMode === 'adjust'
                        ? 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
                        : 'border-white/10 text-white/50 hover:text-white/80'
                    }`}
                  >
                    加減點數
                  </button>
                </div>
              </div>

              {pointsEditMode === 'set' ? (
                <div>
                  <label className="mb-1 block text-xs text-white/50">點數總數 *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editPointsInput}
                    onChange={(e) => {
                      const next = e.target.value
                      if (next === '' || /^\d+$/.test(next)) {
                        setEditPointsInput(next)
                      }
                    }}
                    className="input-field"
                  />
                  <p className="mt-1 text-[11px] text-white/35">
                    直接設定會員目前的點數總額
                  </p>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs text-white/50">加減點數 *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editDeltaInput}
                    onChange={(e) => {
                      const next = e.target.value
                      if (next === '' || /^[+-]?\d*$/.test(next)) {
                        setEditDeltaInput(next)
                      }
                    }}
                    className="input-field"
                    placeholder="例：100 或 -50"
                  />
                  <p className="mt-1 text-[11px] text-white/35">
                    可填正數加點、負數扣點（例：100、-30）
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
                <span className="text-white/45">調整後點數：</span>
                <span className="font-medium text-amber-glow">{resolvedEditPoints}</span>
                {editing.points !== resolvedEditPoints &&
                  (pointsEditMode === 'set'
                    ? parsedSetPoints !== null
                    : parsedDelta !== null) && (
                  <span className="ml-2 text-xs text-white/40">
                    （{editing.points}{' '}
                    {resolvedEditPoints - editing.points >= 0 ? '+' : ''}
                    {resolvedEditPoints - editing.points}）
                  </span>
                )}
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
