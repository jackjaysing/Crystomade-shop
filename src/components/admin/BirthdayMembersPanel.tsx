import { useMemo, useState } from 'react'
import { Gift } from 'lucide-react'
import {
  birthdayGiftTierLabel,
  birthdayMembersExportText,
  buildBirthdayMemberRows,
  defaultBirthdayMonthValue,
  formatBirthdayLabel,
  monthLabel,
  parseMonthInput,
} from '../../lib/adminBirthdayMembers'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import type { AdminRegisteredCustomer, CrystalSoulCard } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface BirthdayMembersPanelProps {
  members: AdminRegisteredCustomer[]
  soulCards: CrystalSoulCard[]
  purchaseMeritByUser?: Map<string, number>
}

/** 後台：本月生日會員（生日禮寄送統計） */
export function BirthdayMembersPanel({
  members,
  soulCards,
  purchaseMeritByUser,
}: BirthdayMembersPanelProps) {
  const [monthValue, setMonthValue] = useState(defaultBirthdayMonthValue)
  const [giftOnly, setGiftOnly] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  const { year, month } = parseMonthInput(monthValue)

  const rows = useMemo(
    () => buildBirthdayMemberRows(members, soulCards, month, purchaseMeritByUser),
    [members, month, purchaseMeritByUser, soulCards]
  )

  const visibleRows = useMemo(
    () => (giftOnly ? rows.filter((row) => row.giftEligible) : rows),
    [giftOnly, rows]
  )

  const eligibleCount = rows.filter((row) => row.giftEligible).length

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(birthdayMembersExportText(visibleRows))
      setCopyMessage('已複製清單')
      window.setTimeout(() => setCopyMessage(''), 2000)
    } catch {
      setCopyMessage('複製失敗')
    }
  }

  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-glow">
            <Gift className="h-4 w-4" strokeWidth={1.75} />
            <h3 className="font-display text-base tracking-wide">生日月會員</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            依註冊生日篩選，方便統計寄送小禮。
            {birthdayGiftTierLabel()} 以上標示為符合生日禮資格。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-white/50">
            月份
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="input-field mt-1 min-w-[10.5rem]"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={visibleRows.length === 0}
            className="mt-5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/65 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-40"
          >
            複製清單
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
        <span>
          {monthLabel(year, month)}共 <strong className="text-white/85">{rows.length}</strong> 位
        </span>
        <span>
          符合生日禮 <strong className="text-amber-glow/90">{eligibleCount}</strong> 位
        </span>
        <label className="inline-flex items-center gap-2 text-xs text-white/55">
          <input
            type="checkbox"
            checked={giftOnly}
            onChange={(e) => setGiftOnly(e.target.checked)}
          />
          只顯示符合生日禮
        </label>
        {copyMessage && <span className="text-xs text-emerald-400">{copyMessage}</span>}
      </div>

      {visibleRows.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">此月份沒有符合條件的會員。</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-xs tracking-wider text-white/45">
                <th className="px-3 py-2.5 font-medium">日期</th>
                <th className="px-3 py-2.5 font-medium">姓名</th>
                <th className="px-3 py-2.5 font-medium">電話</th>
                <th className="px-3 py-2.5 font-medium">生日</th>
                <th className="px-3 py-2.5 font-medium">魔法師等級</th>
                <th className="px-3 py-2.5 font-medium">修為</th>
                <th className="px-3 py-2.5 font-medium">生日禮</th>
                <th className="px-3 py-2.5 font-medium">禮物種類</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.member.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-2.5 text-white/75">
                    {row.birthdayMonth}/{row.birthdayDay}
                  </td>
                  <td className="px-3 py-2.5 text-white/90">{row.member.real_name || '—'}</td>
                  <td className="px-3 py-2.5 text-white/70">
                    {formatPhoneDisplay(row.member.phone)}
                  </td>
                  <td className="px-3 py-2.5 text-white/60">
                    {formatBirthdayLabel(row.member.birthday)}
                  </td>
                  <td className="px-3 py-2.5 text-white/75">{row.magicianTitle}</td>
                  <td className="px-3 py-2.5 text-white/55">{row.totalXp}</td>
                  <td className="px-3 py-2.5">
                    {row.giftEligible ? (
                      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                        符合
                      </span>
                    ) : (
                      <span className="text-xs text-white/35">未達</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white/70">
                    {row.giftType ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassPanel>
  )
}
