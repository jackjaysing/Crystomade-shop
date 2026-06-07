import { Bell, BellRing } from 'lucide-react'
import type { AdminAlertItem } from '../../hooks/useAdminAlerts'

interface AdminAlertsBarProps {
  alerts: AdminAlertItem[]
  listening: boolean
  desktopPermission: NotificationPermission | 'unsupported'
  onRequestDesktop: () => void
  onClearAlerts: () => void
  onGoOrders: () => void
  onGoCustomers: () => void
}

/** 後台新消息通知列 */
export function AdminAlertsBar({
  alerts,
  listening,
  desktopPermission,
  onRequestDesktop,
  onClearAlerts,
  onGoOrders,
  onGoCustomers,
}: AdminAlertsBarProps) {
  const showDesktopCta =
    desktopPermission !== 'unsupported' && desktopPermission !== 'granted'

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-white/70">
          {listening ? (
            <BellRing className="h-4 w-4 text-amber-glow" strokeWidth={1.5} />
          ) : (
            <Bell className="h-4 w-4 text-white/40" strokeWidth={1.5} />
          )}
          <span>
            {listening ? '正在監聽新訂單與新註冊（約每 30 秒）' : '啟動通知監聽中…'}
          </span>
        </div>
        {showDesktopCta && (
          <button
            type="button"
            onClick={() => void onRequestDesktop()}
            className="rounded-full border border-amber-glow/40 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10"
          >
            開啟桌面通知
          </button>
        )}
        {desktopPermission === 'granted' && (
          <span className="text-xs text-emerald-400/90">桌面通知已開啟</span>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-glow/25 bg-amber-glow/5">
          <div className="flex items-center justify-between border-b border-amber-glow/15 px-4 py-2">
            <p className="text-sm font-medium text-amber-glow">新消息（{alerts.length}）</p>
            <button
              type="button"
              onClick={onClearAlerts}
              className="text-xs text-white/45 transition hover:text-white/70"
            >
              全部清除
            </button>
          </div>
          <ul className="max-h-48 divide-y divide-amber-glow/10 overflow-y-auto">
            {alerts.map((alert) => (
              <li key={`${alert.type}-${alert.id}`}>
                <button
                  type="button"
                  onClick={alert.type === 'order' ? onGoOrders : onGoCustomers}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-amber-glow/10"
                >
                  <div>
                    <p className="text-sm text-white/90">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-white/50">{alert.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-glow/70">
                    {alert.type === 'order' ? '訂單' : '註冊'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface TabBadgeProps {
  count: number
}

export function AdminTabBadge({ count }: TabBadgeProps) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-glow px-1.5 py-0.5 text-[10px] font-medium leading-none text-void">
      {count > 99 ? '99+' : count}
    </span>
  )
}
