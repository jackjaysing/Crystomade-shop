import { Link } from 'react-router-dom'
import {
  FIRST_PURCHASE_POINTS_MULTIPLIER,
  POINTS_PER_NTD_EARN,
} from '../../constants/points'
import { useAuth } from '../../contexts/AuthContext'
import { formatPhoneDisplay } from '../../lib/phoneAuth'
import { MemberAuthForm } from './MemberAuthForm'

/** 結帳頁：會員登入／註冊區塊 */
export function CheckoutMemberSection() {
  const { user, profile, logout, loading } = useAuth()

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/40">
        載入會員狀態…
      </div>
    )
  }

  if (user && profile) {
    return (
      <div className="rounded-xl border border-amber-glow/25 bg-amber-glow/[0.06] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-amber-glow/70">MEMBER</p>
            <p className="mt-1 font-display text-lg text-white">
              {profile.real_name}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {formatPhoneDisplay(profile.phone)}
            </p>
            <p className="mt-2 text-sm text-amber-glow/90">
              目前累積 <span className="font-medium">{profile.points}</span> 點
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              to="/account"
              className="text-xs tracking-wide text-white/50 underline-offset-2 hover:text-amber-glow hover:underline"
            >
              會員中心
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-xs text-white/40 hover:text-white/70"
            >
              登出
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">
          本筆訂單將綁定會員帳號；管理員標記已付款或已出貨後，依消費金額回饋 2%（每
          NT${POINTS_PER_NTD_EARN} 累 1 點），首購 {FIRST_PURCHASE_POINTS_MULTIPLIER}{' '}
          倍累點。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs tracking-widest text-white/40">
        結帳須先登入會員
      </p>
      <MemberAuthForm variant="checkout" />
    </div>
  )
}
