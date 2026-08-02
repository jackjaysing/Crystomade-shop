import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CrystalMagicBook } from '../components/grimoire/CrystalMagicBook'
import { AccountGate } from '../components/account/AccountGate'
import { GlassPanel } from '../components/ui/GlassPanel'
import {
  fetchMyCrystalSoulCard,
  setCrystalSoulCardPublic,
  signCrystalEnergyContract,
  transferCrystalSoulCardByPhone,
} from '../lib/api/grimoire'
import { useAuth } from '../contexts/AuthContext'
import type { CrystalSoulCard } from '../lib/types'

/** 會員：單本魔導書沉浸式閱讀 */
export function CrystalGrimoireDetailPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const [card, setCard] = useState<CrystalSoulCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

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
      const updated = await action()
      setCard(updated)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="magic-bookshelf-page magic-grimoire-detail-page min-h-screen pt-24 pb-16 max-md:pb-[calc(14rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
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
              onTransferByPhone={async (phone, confirmCode) => {
                setBusy(true)
                setMessage('')
                try {
                  await transferCrystalSoulCardByPhone(card.id, phone, confirmCode)
                  setMessage('已轉送給朋友，對方可自行簽約。')
                  window.setTimeout(() => {
                    void navigate('/account/grimoire')
                  }, 1200)
                } catch (err) {
                  const text = err instanceof Error ? err.message : '轉送失敗'
                  setMessage(text)
                  throw err
                } finally {
                  setBusy(false)
                }
              }}
              onToggleShare={(isPublic) =>
                runAction(() => setCrystalSoulCardPublic(card.id, isPublic))
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
