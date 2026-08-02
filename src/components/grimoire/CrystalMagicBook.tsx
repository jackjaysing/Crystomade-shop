import { useCallback, useEffect, useState } from 'react'
import { resolveSoulCardDisplayHeadlines } from '../../lib/grimoireFulfillment'
import type { CrystalSoulCard } from '../../lib/types'
import { markSealAnimationPlayed, shouldPlaySealAnimation } from '../../lib/grimoireUnlock'
import { EnergyContractPanel } from './EnergyContractPanel'
import { MagicContractCardPreview } from './MagicContractCardPreview'
import { GiftContractSharePanel } from './GiftContractSharePanel'
import { MagicBookContent } from './MagicBookContent'
import { MagicBookShell } from './MagicBookShell'
import { SealUnlockOverlay } from './SealUnlockOverlay'
import type { MagicBookMode } from './MagicBookContent'

type BookPhase = 'seal' | 'contract' | 'book'

interface CrystalMagicBookProps {
  card: CrystalSoulCard
  mode: MagicBookMode
  signerName?: string
  busy?: boolean
  onToggleShare?: (isPublic: boolean) => Promise<void>
  onSignContract?: () => Promise<void>
  onTransferByPhone?: (phone: string, confirmCode: string) => Promise<void>
}

/** 魔法書完整體驗：封印 → 契約 → 內頁 */
export function CrystalMagicBook({
  card,
  mode,
  signerName,
  busy = false,
  onToggleShare,
  onSignContract,
  onTransferByPhone,
}: CrystalMagicBookProps) {
  const isOwner = mode === 'owner'
  const needsContract = isOwner && !card.contract_signed_at

  const [phase, setPhase] = useState<BookPhase>(() => {
    if (shouldPlaySealAnimation(card.id)) return 'seal'
    if (needsContract) return 'contract'
    return 'book'
  })

  const finishSeal = useCallback(() => {
    markSealAnimationPlayed(card.id)
    setPhase(needsContract ? 'contract' : 'book')
  }, [card.id, needsContract])

  useEffect(() => {
    if (phase !== 'contract') return
    if (!needsContract) setPhase('book')
  }, [needsContract, phase])

  const handleSignContract = async () => {
    if (!onSignContract) return
    await onSignContract()
    setPhase('book')
  }

  const headlines = resolveSoulCardDisplayHeadlines(card.magic_title, card.product_name)
  const bookShellTitle = headlines.secondary ?? headlines.primary

  return (
    <div className="relative">
      {phase === 'seal' && (
        <SealUnlockOverlay
          elementPrimary={card.element_primary}
          onComplete={finishSeal}
        />
      )}

      <MagicBookShell
        tier={card.magic_status}
        title={phase === 'book' ? bookShellTitle : undefined}
        subtitle={
          phase === 'book'
            ? card.serial_number
            : phase === 'contract'
              ? '待簽約'
              : undefined
        }
        className={phase === 'seal' ? 'magic-book-dimmed' : ''}
      >
        {phase === 'contract' && onSignContract && (
          <div className="magic-contract-flow">
            <MagicContractCardPreview
              magicTitle={card.magic_title}
              productName={card.product_name}
              productImageUrl={card.product_image_url}
              magicAffiliation={card.magic_affiliation}
              productTags={card.product_tags}
            />
            <EnergyContractPanel
              signerName={signerName}
              busy={busy}
              intro="簽署後，這本魔導書就正式屬於您。若要送給朋友，請改用下方轉送。"
              signButtonLabel="確認簽約"
              onSign={handleSignContract}
            />
            {isOwner && onTransferByPhone && (
              <>
                <div className="magic-contract-divider">
                  <span>或</span>
                </div>
                <GiftContractSharePanel
                  busy={busy}
                  onTransfer={onTransferByPhone}
                />
              </>
            )}
          </div>
        )}

        {phase === 'book' && (
          <MagicBookContent
            card={card}
            mode={mode}
            busy={busy}
            onToggleShare={onToggleShare}
            onTransferByPhone={isOwner ? onTransferByPhone : undefined}
          />
        )}

        {phase === 'seal' && (
          <div className="magic-book-locked-placeholder" aria-hidden>
            <p>封印之中…</p>
          </div>
        )}
      </MagicBookShell>
    </div>
  )
}
