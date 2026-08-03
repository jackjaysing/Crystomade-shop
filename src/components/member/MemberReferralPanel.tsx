import { useState } from 'react'
import {
  REFERRAL_REFERRER_BONUS_POINTS,
  REFERRAL_WELCOME_BONUS_POINTS,
} from '../../constants/points'
import { copyToClipboard } from '../../lib/copyToClipboard'
import { buildReferralRegisterUrl } from '../../lib/referral'
import type { MemberProfile } from '../../lib/types'
import { AccountSectionHeader } from '../account/AccountSectionHeader'
import { GlassPanel } from '../ui/GlassPanel'

interface MemberReferralPanelProps {
  profile: MemberProfile
}

/** 會員專屬推薦碼與分享連結 */
export function MemberReferralPanel({ profile }: MemberReferralPanelProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const referralCode = profile.referral_code

  if (!referralCode) return null

  const referralLink = buildReferralRegisterUrl(referralCode)

  const handleCopy = async (kind: 'code' | 'link', text: string) => {
    const ok = await copyToClipboard(text)
    if (!ok) return
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 2000)
  }

  return (
    <GlassPanel className="overflow-hidden p-0">
      <div className="relative bg-gradient-to-br from-amber-glow/15 via-void to-void px-6 py-8 sm:px-8">
        <AccountSectionHeader
          eyebrow="REFERRAL"
          title="分享晶刻，賺取點數"
          lead={`分享連結給好友：註冊贈 ${REFERRAL_WELCOME_BONUS_POINTS} 點；好友完成首購，您再得 ${REFERRAL_REFERRER_BONUS_POINTS} 點。`}
        />

        <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-4 sm:p-5">
          <p className="text-xs text-white/45">您的專屬推薦碼</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-display text-2xl tracking-[0.2em] text-amber-glow sm:text-3xl">
              {referralCode}
            </span>
            <button
              type="button"
              onClick={() => void handleCopy('code', referralCode)}
              className="rounded-lg border border-amber-glow/35 bg-amber-glow/10 px-4 py-2 text-sm tracking-wide text-amber-glow transition hover:bg-amber-glow/20"
            >
              {copied === 'code' ? '已複製' : '複製推薦碼'}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 sm:p-5">
          <p className="text-xs text-white/45">一鍵複製推薦連結</p>
          <p className="mt-2 break-all text-sm text-white/70">{referralLink}</p>
          <button
            type="button"
            onClick={() => void handleCopy('link', referralLink)}
            className="mt-4 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm tracking-wide text-white/85 transition hover:border-amber-glow/40 hover:bg-amber-glow/10 hover:text-amber-glow sm:w-auto"
          >
            {copied === 'link' ? '連結已複製' : '複製推薦連結'}
          </button>
        </div>
      </div>
    </GlassPanel>
  )
}
