import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AccountGate } from '../components/account/AccountGate'
import { EnergyContractPanel } from '../components/grimoire/EnergyContractPanel'
import { MagicContractCardPreview } from '../components/grimoire/MagicContractCardPreview'
import { MagicBookShell } from '../components/grimoire/MagicBookShell'
import { SealUnlockOverlay } from '../components/grimoire/SealUnlockOverlay'
import { GlassPanel } from '../components/ui/GlassPanel'
import {
  claimCrystalSoulCardGift,
  fetchGiftClaimCrystalSoulCard,
  type GiftClaimPreview,
} from '../lib/api/grimoire'
import { markSealAnimationPlayed, shouldPlaySealAnimation } from '../lib/grimoireUnlock'
import { useAuth } from '../contexts/AuthContext'

type GiftPhase = 'seal' | 'contract' | 'done'

/** 朋友透過贈送連結簽署契約並接手魔導書 */
export function CrystalSoulCardGiftClaimPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const [preview, setPreview] = useState<GiftClaimPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [phase, setPhase] = useState<GiftPhase>('seal')

  useEffect(() => {
    if (!slug?.trim()) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setNotFound(false)

    void fetchGiftClaimCrystalSoulCard(slug)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setNotFound(true)
          setPreview(null)
        } else {
          setPreview(row)
          setPhase(shouldPlaySealAnimation(`gift-${row.id}`) ? 'seal' : 'contract')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setPreview(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  const finishSeal = useCallback(() => {
    if (preview) markSealAnimationPlayed(`gift-${preview.id}`)
    setPhase('contract')
  }, [preview])

  const handleClaim = async () => {
    if (!slug || !profile) return
    setBusy(true)
    setMessage('')
    try {
      const card = await claimCrystalSoulCardGift(slug, profile.real_name)
      setPhase('done')
      navigate(`/account/grimoire/${card.id}`, { replace: true })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '簽署失敗')
    } finally {
      setBusy(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="magic-bookshelf-page flex min-h-screen items-center justify-center pt-24 text-white/40">
        符文感應中…
      </div>
    )
  }

  if (notFound || !preview) {
    return (
      <div className="magic-bookshelf-page min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <Link to="/products" className="magic-link-back">
            ← 返回典藏選購
          </Link>
          <GlassPanel className="mt-8 p-6 text-sm text-white/45">
            贈送連結已失效，或契約已由朋友完成簽署。
          </GlassPanel>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="magic-bookshelf-page min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <p className="magic-page-eyebrow">GIFT GRIMOIRE</p>
          <h1 className="magic-page-heading magic-foil-heading mt-2">水晶能量契約</h1>
          <p className="magic-page-lead mt-2">
            朋友為你準備了 {preview.magic_title}。請先登入或註冊會員，即可簽署契約並將魔導書收入你的帳戶。
          </p>
          <div className="mt-8">
            <AccountGate />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="magic-bookshelf-page min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <p className="magic-page-eyebrow">GIFT GRIMOIRE</p>
        <h1 className="magic-page-heading magic-foil-text mt-2">收下贈送的水晶</h1>
        <p className="magic-page-lead mt-2">
          簽署能量契約後，此本魔導書將出現在你的會員書架中。
        </p>

        {message && (
          <p className="mt-4 text-sm text-amber-glow/90" role="status">
            {message}
          </p>
        )}

        <div className="relative mt-8">
          {phase === 'seal' && (
            <SealUnlockOverlay
              elementPrimary={preview.element_primary}
              onComplete={finishSeal}
            />
          )}

          <MagicBookShell
            title={preview.magic_title}
            subtitle={preview.serial_number}
            className={phase === 'seal' ? 'magic-book-dimmed' : ''}
          >
            {phase === 'contract' && (
              <>
                <MagicContractCardPreview
                  magicTitle={preview.magic_title}
                  productName={preview.product_name}
                  productImageUrl={preview.product_image_url}
                  magicAffiliation={preview.magic_affiliation}
                  productTags={preview.product_tags}
                />
                <EnergyContractPanel
                  signerName={profile.real_name}
                  busy={busy}
                  intro="有人為你準備了這件水晶。簽署後，你將成為此魔導書的守護者。"
                  signButtonLabel="簽署契約，收入我的魔導書"
                  onSign={handleClaim}
                />
              </>
            )}
            {phase === 'seal' && (
              <div className="magic-book-locked-placeholder" aria-hidden>
                <p>封印感應中…</p>
              </div>
            )}
          </MagicBookShell>
        </div>
      </div>
    </div>
  )
}
