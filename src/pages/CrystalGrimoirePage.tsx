import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountGate } from '../components/account/AccountGate'
import { GlassPanel } from '../components/ui/GlassPanel'
import { fetchMyCrystalSoulCards } from '../lib/api/grimoire'
import { useAuth } from '../contexts/AuthContext'
import type { CrystalSoulCard } from '../lib/types'
import { energyLevelLabel } from '../constants/grimoire'

/** 會員：魔導書書架 */
export function CrystalGrimoirePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [cards, setCards] = useState<CrystalSoulCard[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setMessage('')
    try {
      setCards(await fetchMyCrystalSoulCards(user.id))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

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
          每一本魔導書封印著一件水晶的靈魂印記。輕觸書脊，解開封印並締結能量契約。
        </p>

        {message && (
          <p className="mt-4 text-sm text-amber-glow/90" role="status">
            {message}
          </p>
        )}

        <div className="mt-10">
          {loading ? (
            <GlassPanel className="p-6 text-sm text-white/40">魔導書感應中…</GlassPanel>
          ) : cards.length === 0 ? (
            <GlassPanel className="p-6 text-sm text-white/45">
              書架空無一物。付款確認後，水晶的靈魂將在此顯現。
            </GlassPanel>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {cards.map((card) => (
                <li key={card.id}>
                  <Link
                    to={`/account/grimoire/${card.id}`}
                    className={`magic-bookshelf-item magic-bookshelf-item--tier-${card.magic_status} group block`}
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
                        <p className="magic-bookshelf-title">{card.magic_title}</p>
                        <p className="magic-bookshelf-serial">{card.serial_number}</p>
                        <p className={`magic-bookshelf-rank magic-bookshelf-rank--${card.magic_status}`}>
                          {card.magic_status === 'resonating'
                            ? 'III · 極境'
                            : card.magic_status === 'awakening'
                              ? 'II · 覺醒'
                              : 'I · 初印'}
                        </p>
                        <p className="magic-bookshelf-energy">
                          {energyLevelLabel(card.energy_level)} · {card.energy_level}%
                        </p>
                        {!card.contract_signed_at && (
                          <span className="magic-bookshelf-badge">
                            {card.gift_claim_slug ? '待朋友簽署' : '待簽契約'}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
