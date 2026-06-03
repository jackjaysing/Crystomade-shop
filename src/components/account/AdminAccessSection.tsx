import { Link } from 'react-router-dom'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { AdminLogin } from '../admin/AdminLogin'
import { GlassPanel } from '../ui/GlassPanel'
import { useAdminSession } from '../../hooks/useAdminSession'
import { logoutAdmin } from '../../lib/adminAuth'

/** 管理登入／已登入管理狀態（會員中心、未登入閘道共用） */
export function AdminAccessSection() {
  const { authed, displayName, refresh } = useAdminSession()

  if (authed) {
    return (
      <GlassPanel className="border-amber-glow/25 p-5">
        <p className="text-xs tracking-wide text-white/45">已登入管理</p>
        <p className="mt-1 text-sm text-amber-glow">{displayName ?? '管理者'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-glow/90 px-4 py-2.5 text-sm font-medium tracking-wide text-void transition hover:bg-amber-glow"
          >
            <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
            進入後台
          </Link>
          <button
            type="button"
            onClick={() => {
              logoutAdmin()
              refresh()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/55 transition hover:border-white/30 hover:text-white/80"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            後台登出
          </button>
        </div>
      </GlassPanel>
    )
  }

  return <AdminLogin variant="embed" onSuccess={refresh} />
}
