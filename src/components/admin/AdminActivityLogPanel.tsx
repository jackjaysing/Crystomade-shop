import { RefreshCw } from 'lucide-react'
import type { AdminActivityLog } from '../../lib/api/adminActivityLog'
import { GlassPanel } from '../ui/GlassPanel'

interface AdminActivityLogPanelProps {
  logs: AdminActivityLog[]
  loading: boolean
  error: string | null
  onReload: () => void
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const ACTION_LABEL: Record<string, string> = {
  create: '新增',
  update: '修改',
  delete: '刪除',
  restore: '還原',
  sort: '排序',
  status: '狀態',
}

const ENTITY_LABEL: Record<string, string> = {
  product: '商品',
  order: '訂單',
  banner: '公告橫幅',
}

/** 後台操作日誌列表 */
export function AdminActivityLogPanel({
  logs,
  loading,
  error,
  onReload,
}: AdminActivityLogPanelProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg tracking-wide text-white/80">後台日誌</h2>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/50 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            strokeWidth={1.5}
            aria-hidden
          />
          重新整理
        </button>
      </div>

      {error && (
        <GlassPanel className="mb-4 border-amber-glow/20 p-5">
          <p className="text-sm text-amber-glow/90">{error}</p>
        </GlassPanel>
      )}

      {!error && loading && logs.length === 0 && (
        <p className="text-center text-sm text-white/40">載入日誌中…</p>
      )}

      {!error && !loading && logs.length === 0 && (
        <p className="text-center text-sm text-white/40">尚無操作紀錄</p>
      )}

      {logs.length > 0 && (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id}>
              <GlassPanel className="border-white/5 p-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-white/45">
                  <time dateTime={log.created_at}>{formatLogTime(log.created_at)}</time>
                  <span aria-hidden>·</span>
                  <span className="text-amber-glow/80">{log.admin_name}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {ACTION_LABEL[log.action] ?? log.action}
                    {ENTITY_LABEL[log.entity_type] ?? log.entity_type}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  {log.summary}
                </p>
              </GlassPanel>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
