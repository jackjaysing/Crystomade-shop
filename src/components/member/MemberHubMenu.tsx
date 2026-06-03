import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Store, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePointRedeemState } from '../../hooks/usePointRedeemState'

/** 手機版：點數商城 + 會員中心合併為單一圖示選單 */
export function MemberHubMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const { availablePoints, pointsReserved } = usePointRedeemState()

  const isActive =
    pathname.startsWith('/point-shop') || pathname.startsWith('/account')

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="relative md:hidden" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-full border p-2.5 transition ${
          isActive
            ? 'border-amber-glow/50 bg-amber-glow/15 text-amber-glow'
            : 'border-white/10 text-white/70 hover:border-amber-glow/40 hover:text-amber-glow'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="會員與點數商城"
      >
        <Sparkles className="h-5 w-5" strokeWidth={1.5} />
        {profile && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-glow px-0.5 text-[9px] font-medium text-void">
            {availablePoints > 99 ? '99+' : availablePoints}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-graphite py-1 shadow-lg shadow-black/40"
        >
          {profile && (
            <div className="border-b border-white/10 px-3 py-2.5">
              <p className="text-[10px] tracking-wide text-white/40">可用點數</p>
              <p className="text-sm font-medium tabular-nums text-amber-glow">
                {availablePoints} 點
                {pointsReserved > 0 && (
                  <span className="ml-1 text-[10px] font-normal text-white/45">
                    （預留 {pointsReserved}）
                  </span>
                )}
              </p>
            </div>
          )}

          <Link
            to="/point-shop"
            role="menuitem"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition hover:bg-white/5 ${
              pathname.startsWith('/point-shop')
                ? 'text-amber-glow'
                : 'text-white/80'
            }`}
          >
            <Store className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            點數商城
          </Link>

          <Link
            to="/account"
            role="menuitem"
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition hover:bg-white/5 ${
              pathname.startsWith('/account')
                ? 'text-amber-glow'
                : 'text-white/80'
            }`}
          >
            <User className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {profile ? '會員中心' : '會員登入'}
          </Link>
        </div>
      )}
    </div>
  )
}
