import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AdminLogin } from '../admin/AdminLogin'
import { AdminAccessSection } from './AdminAccessSection'
import { MemberAuthForm } from '../member/MemberAuthForm'
import { useAdminSession } from '../../hooks/useAdminSession'

type LoginKind = 'member' | 'admin'

/** 未登入會員時：一般登入／管理登入 */
export function AccountGate() {
  const [kind, setKind] = useState<LoginKind>('member')
  const { authed: adminAuthed, refresh } = useAdminSession()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const openRegister =
    Boolean(searchParams.get('ref')) ||
    (location.state as { register?: boolean } | null)?.register === true

  useEffect(() => {
    if (adminAuthed) setKind('member')
  }, [adminAuthed])

  return (
    <div className="min-h-screen pt-24 pb-16 max-md:pb-[calc(14rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-md px-6">
        <p className="text-xs tracking-[0.4em] text-amber-glow/60">MEMBER</p>
        <h1 className="mt-2 font-display text-4xl text-white">會員中心</h1>
        <p className="mt-3 text-sm text-white/50">
          {adminAuthed
            ? '已登入管理；請在下方使用一般登入查看會員點數與訂單。'
            : '一般會員可查看點數與訂單；管理者請使用管理登入。'}
        </p>

        {adminAuthed && (
          <div className="mt-6">
            <AdminAccessSection />
          </div>
        )}

        {adminAuthed ? (
          <div className="mt-6">
            <p className="text-sm tracking-wide text-white/50">一般登入</p>
            <div className="mt-4">
              <MemberAuthForm
                variant="page"
                initialMode={openRegister ? 'register' : 'login'}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setKind('member')}
                className={`flex-1 rounded-lg border py-2.5 text-sm tracking-wide transition ${
                  kind === 'member'
                    ? 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
                    : 'border-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                一般登入
              </button>
              <button
                type="button"
                onClick={() => setKind('admin')}
                className={`flex-1 rounded-lg border py-2.5 text-sm tracking-wide transition ${
                  kind === 'admin'
                    ? 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
                    : 'border-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                管理登入
              </button>
            </div>

            <div className="mt-4">
              {kind === 'member' ? (
                <MemberAuthForm
                  variant="page"
                  initialMode={openRegister ? 'register' : 'login'}
                />
              ) : (
                <AdminLogin variant="embed" onSuccess={refresh} />
              )}
            </div>
          </>
        )}

        <p className="mt-6 text-center text-sm text-white/40">
          <Link to="/products" className="hover:text-amber-glow">
            返回典藏
          </Link>
        </p>
      </div>
    </div>
  )
}
