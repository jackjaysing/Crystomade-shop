import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CrystalMagicBook } from '../components/grimoire/CrystalMagicBook'
import { AccountGate } from '../components/account/AccountGate'
import { GlassPanel } from '../components/ui/GlassPanel'
import {
  advanceCrystalSoulCardStatus,
  completeCrystalGrimoireTask,
  enableCrystalSoulCardGiftClaim,
  fetchMyCrystalSoulCard,
  setCrystalSoulCardPublic,
  signCrystalEnergyContract,
} from '../lib/api/grimoire'
import { devMaxUpgradeCrystalSoulCard } from '../lib/dev/grimoireUpgrade'
import { CRYSTAL_MAGIC_RANK } from '../constants/grimoire'
import { useAuth } from '../contexts/AuthContext'
import type { CrystalSoulCard } from '../lib/types'

/** 會員：單本魔導書沉浸式閱讀 */
export function CrystalGrimoireDetailPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [card, setCard] = useState<CrystalSoulCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const devUpgradeRan = useRef(false)

  const reload = useCallback(async () => {
    if (!user?.id || !cardId) return
    setLoading(true)
    setMessage('')
    try {
      setCard(await fetchMyCrystalSoulCard(user.id, cardId))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
      setCard(null)
    } finally {
      setLoading(false)
    }
  }, [cardId, user?.id])

  useEffect(() => {
    if (!user?.id || !cardId) return
    void reload()
  }, [cardId, reload, user?.id])

  const runDevUpgrade = useCallback(async () => {
    if (!card || !profile) return
    setBusy(true)
    setMessage('開發升級中…')
    try {
      const upgraded = await devMaxUpgradeCrystalSoulCard(card, profile.real_name)
      setCard(upgraded)
      setMessage(
        `已晉升至 ${CRYSTAL_MAGIC_RANK[upgraded.magic_status].title}階 · ${CRYSTAL_MAGIC_RANK[upgraded.magic_status].epithet} · 能量 ${upgraded.energy_level}%`
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '開發升級失敗')
    } finally {
      setBusy(false)
    }
  }, [card, profile])

  useEffect(() => {
    if (!import.meta.env.DEV || !card || busy || devUpgradeRan.current) return
    if (searchParams.get('devUpgrade') !== '1') return
    devUpgradeRan.current = true
    const next = new URLSearchParams(searchParams)
    next.delete('devUpgrade')
    setSearchParams(next, { replace: true })
    void runDevUpgrade()
  }, [busy, card, runDevUpgrade, searchParams, setSearchParams])

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center pt-28 text-white/40">
        載入中…
      </div>
    )
  }

  if (!user || !profile) {
    return <AccountGate />
  }

  const runAction = async (action: () => Promise<CrystalSoulCard>) => {
    setBusy(true)
    setMessage('')
    try {
      setCard(await action())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="magic-bookshelf-page min-h-screen pt-24 pb-16 max-md:pb-[calc(14rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <Link
          to="/account/grimoire"
          className="magic-link-back"
        >
          ← 返回書架
        </Link>

        {message && (
          <p className="mt-4 text-sm text-amber-glow/90" role="status">
            {message}
          </p>
        )}

        {import.meta.env.DEV && card && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runDevUpgrade()}
            className="mt-4 rounded-lg border border-dashed border-amber-glow/35 bg-amber-glow/5 px-4 py-2 text-xs tracking-wide text-amber-glow/80 transition hover:bg-amber-glow/10 disabled:opacity-50"
          >
            開發：一鍵升級至共鳴滿級
          </button>
        )}

        <div className="mt-8">
          {loading ? (
            <GlassPanel className="p-6 text-sm text-white/40">封印感應中…</GlassPanel>
          ) : !card ? (
            <GlassPanel className="p-6 text-sm text-white/45">
              找不到這本魔導書。
            </GlassPanel>
          ) : (
            <CrystalMagicBook
              card={card}
              mode="owner"
              signerName={profile.real_name}
              busy={busy}
              onSignContract={() =>
                runAction(() => signCrystalEnergyContract(card.id, profile.real_name))
              }
              onEnableGiftClaim={() =>
                runAction(() => enableCrystalSoulCardGiftClaim(card.id))
              }
              onToggleShare={(isPublic) =>
                runAction(() => setCrystalSoulCardPublic(card.id, isPublic))
              }
              onAdvanceStatus={() =>
                runAction(() => advanceCrystalSoulCardStatus(card.id))
              }
              onCompleteTask={(task) =>
                runAction(() => completeCrystalGrimoireTask(card.id, task))
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
