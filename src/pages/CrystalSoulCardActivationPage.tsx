import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AccountGate } from '../components/account/AccountGate'
import { EnergyContractPanel } from '../components/grimoire/EnergyContractPanel'
import { MagicContractCardPreview } from '../components/grimoire/MagicContractCardPreview'
import { MagicBookShell } from '../components/grimoire/MagicBookShell'
import { SealUnlockOverlay } from '../components/grimoire/SealUnlockOverlay'
import { GlassPanel } from '../components/ui/GlassPanel'
import {
  fetchActivationCrystalSoulCard,
  fetchActivationCrystalSoulCardRole,
  signCrystalEnergyContractByActivation,
  type ActivationClaimPreview,
  type ActivationSoulCardRole,
} from '../lib/api/grimoire'
import { markSealAnimationPlayed, shouldPlaySealAnimation } from '../lib/grimoireUnlock'
import { useAuth } from '../contexts/AuthContext'

type ActivationPhase = 'seal' | 'contract' | 'done'

/** 掃描隨貨 QR：購買人簽署，或友人轉傳後接手 */
export function CrystalSoulCardActivationPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const [preview, setPreview] = useState<ActivationClaimPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [phase, setPhase] = useState<ActivationPhase>('seal')
  const [role, setRole] = useState<ActivationSoulCardRole>('anonymous')

  useEffect(() => {
    if (!slug?.trim()) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setNotFound(false)

    void fetchActivationCrystalSoulCard(slug)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setNotFound(true)
          setPreview(null)
        } else {
          setPreview(row)
          setPhase(shouldPlaySealAnimation(`activation-${row.id}`) ? 'seal' : 'contract')
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

  useEffect(() => {
    if (!slug?.trim() || !user) {
      setRole('anonymous')
      return
    }

    let cancelled = false
    void fetchActivationCrystalSoulCardRole(slug)
      .then((next) => {
        if (!cancelled) setRole(next)
      })
      .catch(() => {
        if (!cancelled) setRole('invalid')
      })

    return () => {
      cancelled = true
    }
  }, [slug, user])

  const finishSeal = useCallback(() => {
    if (preview) markSealAnimationPlayed(`activation-${preview.id}`)
    setPhase('contract')
  }, [preview])

  const handleSign = async () => {
    if (!slug || !profile) return
    setBusy(true)
    setMessage('')
    try {
      const card = await signCrystalEnergyContractByActivation(slug, profile.real_name)
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
            簽約連結已失效，或契約已完成簽署。
            <Link to="/account/grimoire" className="mt-3 block text-amber-glow/80 hover:underline">
              前往會員魔導書 →
            </Link>
          </GlassPanel>
        </div>
      </div>
    )
  }

  const isRecipient = role === 'recipient'

  if (!user || !profile) {
    return (
      <div className="magic-bookshelf-page min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <p className="magic-page-eyebrow">CRYSTAL GRIMOIRE</p>
          <h1 className="magic-page-heading magic-foil-heading mt-2">水晶魔法身分證</h1>
          <p className="magic-page-lead mt-2">
            {preview.magic_title} 的封印已感應。請登入會員帳號：購買人可直接簽署；若為友人轉傳，登入後簽約即可接手此魔導書。
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
        <p className="magic-page-eyebrow">CRYSTAL GRIMOIRE</p>
        <h1 className="magic-page-heading magic-foil-heading mt-2">
          {isRecipient ? '接手水晶魔法身分證' : '開啟你的魔法身分證'}
        </h1>
        <p className="magic-page-lead mt-2">
          {isRecipient
            ? '友人將隨貨封印轉傳給你。簽署能量契約後，此本魔導書將收入你的會員書架。'
            : '掃描隨貨封印後，簽署能量契約，讓水晶與你正式連結。'}
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
            tier="dormant"
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
                  intro={
                    isRecipient
                      ? '這件水晶由友人轉贈予你。簽署後，你將成為此魔導書的守護者。'
                      : '此件水晶已與你的帳戶綁定。簽署後，即可在魔導書中滋養能量、提升階級。'
                  }
                  signButtonLabel={
                    isRecipient
                      ? '簽署契約，收入我的魔導書'
                      : '簽署契約，正式啟動魔法身分證'
                  }
                  onSign={handleSign}
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
