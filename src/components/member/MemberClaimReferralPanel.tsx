import { useState, type FormEvent } from 'react'
import { REFERRAL_WELCOME_BONUS_POINTS, WELCOME_BONUS_POINTS } from '../../constants/points'
import { claimMemberReferralCode } from '../../lib/api/members'
import { normalizeReferralCode, sanitizeReferralInput } from '../../lib/referral'
import type { MemberProfile } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface MemberClaimReferralPanelProps {
  userId: string
  profile: MemberProfile
  onClaimed?: () => void | Promise<void>
}

/** 註冊時未填推薦碼，可於會員中心事後補填（僅一次） */
export function MemberClaimReferralPanel({
  userId,
  profile,
  onClaimed,
}: MemberClaimReferralPanelProps) {
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (profile.referred_by) return null

  const activeCode = normalizeReferralCode(input)
  const bonusTopUp = Math.max(0, REFERRAL_WELCOME_BONUS_POINTS - WELCOME_BONUS_POINTS)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeCode) {
      setError('請輸入有效的推薦碼（4–12 碼英數字）')
      return
    }
    if (activeCode === profile.referral_code) {
      setError('無法使用自己的推薦碼')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await claimMemberReferralCode(userId, activeCode)
      setSuccess(
        bonusTopUp > 0
          ? `已成功綁定推薦碼 ${activeCode}，並獲得推薦專屬加碼 ${bonusTopUp} 點！`
          : `已成功綁定推薦碼 ${activeCode}！`
      )
      setInput('')
      await onClaimed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '綁定失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassPanel className="mt-6 p-6 sm:p-8">
      <p className="text-xs tracking-[0.35em] text-amber-glow/70">REFERRAL</p>
      <h2 className="mt-2 font-display text-xl text-white sm:text-2xl">
        補填好友推薦碼
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        註冊時忘了填推薦碼？在此補填即可綁定推薦關係。
        {bonusTopUp > 0 && (
          <>
            {' '}
            若尚未領取推薦加碼，將額外獲得 {bonusTopUp} 點（合計{' '}
            {REFERRAL_WELCOME_BONUS_POINTS} 點迎新禮）。
          </>
        )}
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-xs text-white/45">好友推薦碼</label>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="例：JK8888"
            value={input}
            onChange={(e) => setInput(sanitizeReferralInput(e.target.value))}
            className="input-field uppercase tracking-widest"
            autoComplete="off"
            maxLength={12}
            disabled={submitting}
          />
          {input && !activeCode && (
            <p className="mt-1 text-[11px] text-white/35">推薦碼為 4–12 碼英數字</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}

        <button
          type="submit"
          disabled={submitting || !activeCode}
          className="w-full rounded-lg border border-amber-glow/40 bg-amber-glow/15 py-3 text-sm font-medium tracking-widest text-amber-glow transition hover:bg-amber-glow/25 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {submitting ? '綁定中…' : '確認綁定推薦碼'}
        </button>
      </form>
    </GlassPanel>
  )
}
