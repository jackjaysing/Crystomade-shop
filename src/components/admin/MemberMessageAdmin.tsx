import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Mail, Send, Users } from 'lucide-react'
import {
  adminListOwlMessageBatches,
  adminSendOwlMessageToAll,
  adminSendOwlMessageToMember,
} from '../../lib/api/memberMessages'
import {
  fetchRegisteredCustomers,
  formatPhoneDisplay,
} from '../../lib/api/adminCustomers'
import type { AdminOwlMessageBatch, AdminRegisteredCustomer } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface MemberMessageAdminProps {
  enabled: boolean
  onToast: (message: string) => void
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** 後台：貓頭鷹信件 — 寄給指定會員或全體 */
export function MemberMessageAdmin({ enabled, onToast }: MemberMessageAdminProps) {
  const [members, setMembers] = useState<AdminRegisteredCustomer[]>([])
  const [batches, setBatches] = useState<AdminOwlMessageBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [target, setTarget] = useState<'one' | 'all'>('one')
  const [userId, setUserId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const [memberRows, batchRows] = await Promise.all([
        fetchRegisteredCustomers(),
        adminListOwlMessageBatches(40),
      ])
      setMembers(memberRows)
      setBatches(batchRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (sending) return
    const trimmedBody = body.trim()
    if (!trimmedBody) {
      alert('請輸入信件內容')
      return
    }
    if (target === 'one' && !userId) {
      alert('請選擇會員')
      return
    }
    if (target === 'all') {
      const ok = window.confirm(
        `確定要寄給全體 ${members.length} 位註冊會員？每位都會收到貓頭鷹信件。`
      )
      if (!ok) return
    }

    setSending(true)
    try {
      if (target === 'all') {
        const count = await adminSendOwlMessageToAll({
          subject,
          body: trimmedBody,
        })
        onToast(`已派出貓頭鷹，寄給 ${count} 位會員`)
      } else {
        const member = members.find((m) => m.id === userId)
        await adminSendOwlMessageToMember({
          userId,
          subject,
          body: trimmedBody,
          recipientLabel: member
            ? `${member.real_name}（${formatPhoneDisplay(member.phone)}）`
            : undefined,
        })
        onToast(
          member
            ? `已派出貓頭鷹給 ${member.real_name}`
            : '已派出貓頭鷹信件'
        )
      }
      setSubject('')
      setBody('')
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : '寄送失敗')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <GlassPanel className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-amber-glow" strokeWidth={1.5} />
          <h3 className="font-display text-lg tracking-wide text-white">
            撰寫貓頭鷹信件
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/45">
          會員登入後，左下角會有卷軸「信件」按鈕；點開是可長期保留的信件匣。
          有新信時貓頭鷹也會飛來提示。可寄給單一會員或全體註冊會員。
        </p>

        <form onSubmit={(e) => void handleSend(e)} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTarget('one')}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                target === 'one'
                  ? 'border-amber-glow/60 bg-amber-glow/15 text-amber-glow'
                  : 'border-white/15 text-white/55 hover:border-amber-glow/40'
              }`}
            >
              指定會員
            </button>
            <button
              type="button"
              onClick={() => setTarget('all')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
                target === 'all'
                  ? 'border-amber-glow/60 bg-amber-glow/15 text-amber-glow'
                  : 'border-white/15 text-white/55 hover:border-amber-glow/40'
              }`}
            >
              <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
              全體會員
            </button>
          </div>

          {target === 'one' && (
            <div>
              <label className="block text-xs text-white/50">收件會員</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="admin-select mt-1"
                disabled={sending || loading}
              >
                <option value="">選擇會員…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.real_name} · {formatPhoneDisplay(m.phone)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-white/50">主旨（選填）</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              maxLength={80}
              placeholder="例如：訂單小提醒"
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50">信件內容</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              rows={6}
              maxLength={4000}
              placeholder="寫下要告訴會員的話…"
              className="input-field mt-1 min-h-[9rem] resize-y"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-glow/50 bg-amber-glow/15 px-5 py-2.5 text-sm text-amber-glow transition hover:bg-amber-glow/25 disabled:opacity-50"
          >
            <Send className="h-4 w-4" strokeWidth={1.5} />
            {sending
              ? '貓頭鷹起飛中…'
              : target === 'all'
                ? '寄給全體會員'
                : '派出貓頭鷹'}
          </button>
        </form>
      </GlassPanel>

      <section>
        <h3 className="mb-3 text-lg tracking-wide text-white/80">寄送紀錄</h3>
        {error && (
          <p className="mb-3 text-sm text-amber-glow/90">{error}</p>
        )}
        {loading && batches.length === 0 ? (
          <p className="text-sm text-white/40">載入中…</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-white/40">尚無寄送紀錄</p>
        ) : (
          <ul className="space-y-3">
            {batches.map((batch) => (
              <li key={batch.batch_id}>
                <GlassPanel className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base text-amber-glow/90">
                        {batch.subject.trim() || '（無主旨）'}
                      </p>
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-white/55">
                        {batch.body}
                      </p>
                      <p className="mt-2 text-[11px] text-white/35">
                        {formatTime(batch.created_at)} · {batch.sent_by_admin_name}
                        {batch.is_broadcast
                          ? ` · 全體 ${batch.recipient_count} 人`
                          : ` · ${batch.sample_recipient_name ?? '會員'}`}
                        {' · '}
                        已讀 {batch.read_count}/{batch.recipient_count}
                        {batch.member_deleted_count > 0
                          ? ` · 會員已刪除 ${batch.member_deleted_count}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] ${
                        batch.is_broadcast
                          ? 'border-amber-glow/45 text-amber-glow'
                          : 'border-white/15 text-white/50'
                      }`}
                    >
                      {batch.is_broadcast ? '全體' : '指定'}
                    </span>
                  </div>
                </GlassPanel>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
