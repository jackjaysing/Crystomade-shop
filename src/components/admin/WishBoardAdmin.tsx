import { useCallback, useEffect, useState } from 'react'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import {
  deleteWishMessage,
  fetchAllWishMessagesAdmin,
} from '../../lib/api/wishBoard'
import type { WishMessage } from '../../lib/types'
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

interface WishBoardAdminProps {
  enabled: boolean
  reloadSignal?: number
}

/** 後台：許願留言列表 */
export function WishBoardAdmin({
  enabled,
  reloadSignal = 0,
}: WishBoardAdminProps) {
  const { isSuperAdmin } = useAdminSession()
  const [wishes, setWishes] = useState<WishMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError('')
    try {
      const rows = await fetchAllWishMessagesAdmin()
      setWishes(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload, reloadSignal])

  const handleDelete = async (wish: WishMessage) => {
    if (!confirm(`確定刪除此許願？\n「${wish.content.slice(0, 40)}…」`)) return
    setBusyId(wish.id)
    try {
      await deleteWishMessage(wish.id)
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
          {loading ? '載入中…' : `共 ${wishes.length} 則許願`}
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

      {!loading && !error && wishes.length === 0 && (
        <GlassPanel className="p-8 text-center text-sm text-white/50">
          目前尚無許願留言
        </GlassPanel>
      )}

      <ul className="space-y-3">
        {wishes.map((wish) => {
          const busy = busyId === wish.id
          return (
            <li key={wish.id}>
              <GlassPanel className="p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                  {wish.content}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/40">
                    <span className="text-amber-glow/80">{wish.display_name}</span>
                    {wish.member_phone && (
                      <span>{formatPhoneDisplay(wish.member_phone)}</span>
                    )}
                    <span>{formatDateTime(wish.created_at)}</span>
                  </div>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(wish)}
                      className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-300/80 transition hover:border-red-400/40 disabled:opacity-50"
                    >
                      刪除
                    </button>
                  )}
                </div>
              </GlassPanel>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
