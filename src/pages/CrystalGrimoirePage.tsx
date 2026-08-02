import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountGate } from '../components/account/AccountGate'
import { MagicianLevelPanel } from '../components/grimoire/MagicianLevelPanel'
import { VipXpLedgerPanel } from '../components/grimoire/VipXpLedgerPanel'
import { GlassPanel } from '../components/ui/GlassPanel'
import {
  fetchMyCrystalSoulCards,
  fetchMemberVipPurchaseXp,
  fetchMemberVipXpLedger,
  type VipXpLedgerEntry,
} from '../lib/api/grimoire'
import { useAuth } from '../contexts/AuthContext'
import type { CrystalSoulCard } from '../lib/types'
import { resolveSoulCardDisplayHeadlines } from '../lib/grimoireFulfillment'

/** 會員：魔導書書架 */
export function CrystalGrimoirePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [cards, setCards] = useState<CrystalSoulCard[]>([])
  const [purchaseAmount, setPurchaseAmount] = useState(0)
  const [xpLedger, setXpLedger] = useState<VipXpLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setMessage('')
    try {
      await refreshProfile()
      const [nextCards, vipXp, ledger] = await Promise.all([
        fetchMyCrystalSoulCards(user.id),
        fetchMemberVipPurchaseXp(user.id),
        fetchMemberVipXpLedger(user.id),
      ])
      setCards(nextCards)
      setPurchaseAmount(vipXp)
      setXpLedger(ledger)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
      setCards([])
      setXpLedger([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, refreshProfile])

  useEffect(() => {
    if (!user?.id) return
    void reload()
  }, [reload, user?.id])

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

  return (
    <div className="magic-bookshelf-page min-h-screen pt-24 pb-16 max-md:pb-[calc(14rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-3xl px-6">
        <Link to="/account" className="magic-link-back">
          ← 返回會員中心
        </Link>
        <p className="magic-page-eyebrow mt-6">GRIMOIRE</p>
        <h1 className="magic-page-heading magic-foil-text mt-2">我的水晶魔導書</h1>
        <p className="magic-page-lead mt-2">
          已購買商品可選擇簽約，或轉送給他人。
        </p>

        {message && (
          <p className="mt-4 text-sm text-amber-glow/90" role="status">
            {message}
          </p>
        )}

        <div className="mt-8">
          <MagicianLevelPanel
            cards={cards}
            meritXp={profile.grimoire_merit_xp}
            purchaseAmount={purchaseAmount}
          />
        </div>

        <div className="mt-8">
          <VipXpLedgerPanel entries={xpLedger} loading={loading} />
        </div>

        <div className="mt-8">
          <h2 className="font-display text-lg text-white/90">我的魔導書</h2>
        </div>

        <div className="mt-4">
          {loading ? (
            <GlassPanel className="p-6 text-sm text-white/40">魔導書感應中…</GlassPanel>
          ) : cards.length === 0 ? (
            <GlassPanel className="p-6 text-sm text-white/45">
              還沒有魔導書。商品出貨後，水晶魔法身分證會出現在這裡。
            </GlassPanel>
          ) : (
            <ul className="magic-bookshelf-grid grid gap-5 sm:grid-cols-2">
              {cards.map((card) => {
                const headlines = resolveSoulCardDisplayHeadlines(
                  card.magic_title,
                  card.product_name
                )

                return (
                <li key={card.id} className="h-full">
                  <Link
                    to={`/account/grimoire/${card.id}`}
                    className={`magic-bookshelf-item magic-bookshelf-item--tier-${card.magic_status} group block h-full`}
                  >
                    <div className="magic-bookshelf-spine" aria-hidden />
                    <div className="magic-bookshelf-cover">
                      {card.product_image_url ? (
                        <img
                          src={card.product_image_url}
                          alt=""
                          className="magic-bookshelf-thumb"
                        />
                      ) : (
                        <span className="magic-bookshelf-glyph">✦</span>
                      )}
                      <div className="magic-bookshelf-meta">
                        <p className="magic-bookshelf-title">{headlines.primary}</p>
                        {headlines.secondary && (
                          <p className="magic-bookshelf-subtitle">{headlines.secondary}</p>
                        )}
                        <p className="magic-bookshelf-serial">{card.serial_number}</p>
                        <div className="magic-bookshelf-badge-slot">
                          <span
                            className={`magic-bookshelf-badge${
                              card.contract_signed_at ? ' magic-bookshelf-badge--signed' : ''
                            }`}
                          >
                            {card.contract_signed_at ? '已簽約' : '待簽約'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
