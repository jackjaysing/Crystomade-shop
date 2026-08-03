import { formatVipXp } from '../../lib/grimoireMagicianLevel'
import type { VipXpLedgerEntry } from '../../lib/api/grimoire'
import { GlassPanel } from '../ui/GlassPanel'

function formatLedgerDate(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split('-')
  if (parts.length !== 3) return isoDate
  const [y, m, d] = parts
  return `${y}年${Number(m)}月${Number(d)}日`
}

interface VipXpLedgerPanelProps {
  entries: VipXpLedgerEntry[]
  loading?: boolean
}

/** 會員魔導書：經驗累積紀錄（依日） */
export function VipXpLedgerPanel({ entries, loading = false }: VipXpLedgerPanelProps) {
  return (
    <GlassPanel className="p-5 sm:p-6">
      <p className="text-xs tracking-[0.35em] text-amber-glow/70">XP HISTORY</p>
      <h2 className="mt-2 font-display text-xl text-white">經驗累積紀錄</h2>

      {loading ? (
        <p className="mt-5 text-sm text-white/40">載入中…</p>
      ) : entries.length === 0 ? (
        <p className="mt-5 text-sm text-white/45">尚無紀錄</p>
      ) : (
        <ul className="mt-5 divide-y divide-white/10" aria-label="經驗累積紀錄">
          {entries.map((entry) => (
            <li
              key={entry.spendDate}
              className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
            >
              <span className="text-white/60">{formatLedgerDate(entry.spendDate)}</span>
              <span className="font-medium text-amber-glow/90">
                +{formatVipXp(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  )
}
