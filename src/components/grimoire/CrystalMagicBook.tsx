import { useCallback, useEffect, useRef, useState } from 'react'
import type { GrimoireTaskType } from '../../constants/grimoire'
import { magicStatusTier } from '../../constants/grimoire'
import { resolveSoulCardDisplayHeadlines } from '../../lib/grimoireFulfillment'
import type { CrystalSoulCard } from '../../lib/types'
import { markSealAnimationPlayed, shouldPlaySealAnimation } from '../../lib/grimoireUnlock'
import { EnergyContractPanel } from './EnergyContractPanel'
import { MagicContractCardPreview } from './MagicContractCardPreview'
import { GiftContractSharePanel } from './GiftContractSharePanel'
import { MagicBookContent } from './MagicBookContent'
import { MagicGrimoireTaskPanel } from './MagicGrimoireTaskPanel'
import { MagicBookShell } from './MagicBookShell'
import { RankUpOverlay } from './RankUpOverlay'
import { SealUnlockOverlay } from './SealUnlockOverlay'
import type { MagicBookMode } from './MagicBookContent'
import type { CrystalMagicStatus } from '../../constants/grimoire'

type BookPhase = 'seal' | 'contract' | 'book'

interface CrystalMagicBookProps {
  card: CrystalSoulCard
  mode: MagicBookMode
  signerName?: string
  busy?: boolean
  onToggleShare?: (isPublic: boolean) => Promise<void>
  onSignContract?: () => Promise<void>
  onEnableGiftClaim?: () => Promise<void>
  onCompleteTask?: (task: GrimoireTaskType) => Promise<void>
}

/** 魔法書完整體驗：封印 → 契約 → 內頁 */
export function CrystalMagicBook({
  card,
  mode,
  signerName,
  busy = false,
  onToggleShare,
  onSignContract,
  onEnableGiftClaim,
  onCompleteTask,
}: CrystalMagicBookProps) {
  const isOwner = mode === 'owner'
  const needsContract = isOwner && !card.contract_signed_at

  const [phase, setPhase] = useState<BookPhase>(() => {
    if (shouldPlaySealAnimation(card.id)) return 'seal'
    if (needsContract) return 'contract'
    return 'book'
  })
  const prevStatusRef = useRef<CrystalMagicStatus>(card.magic_status)
  const [rankUpStatus, setRankUpStatus] = useState<CrystalMagicStatus | null>(null)

  useEffect(() => {
    const prevTier = magicStatusTier(prevStatusRef.current)
    const nextTier = magicStatusTier(card.magic_status)
    if (nextTier > prevTier && phase === 'book') {
      setRankUpStatus(card.magic_status)
    }
    prevStatusRef.current = card.magic_status
  }, [card.magic_status, phase])

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

  const showTaskPanel = isOwner && phase === 'book' && Boolean(onCompleteTask)
  const headlines = resolveSoulCardDisplayHeadlines(card.magic_title, card.product_name)
  const bookShellTitle = headlines.secondary ?? headlines.primary

  return (
    <div className={showTaskPanel ? 'magic-book-layout relative' : 'relative'}>
      {rankUpStatus && (
        <RankUpOverlay
          status={rankUpStatus}
          onDone={() => setRankUpStatus(null)}
        />
      )}

      {phase === 'seal' && (
        <SealUnlockOverlay
          elementPrimary={card.element_primary}
          onComplete={finishSeal}
        />
      )}

      <div className={showTaskPanel ? 'magic-book-layout-main' : ''}>
      <MagicBookShell
        tier={card.magic_status}
        title={phase === 'book' ? bookShellTitle : undefined}
        subtitle={
          phase === 'book'
            ? card.serial_number
            : phase === 'contract'
              ? '待締結之頁'
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
              intro="此水晶將與您建立能量連結，簽署後即可在魔導書中滋養與互動。"
              onSign={handleSignContract}
            />
            {isOwner && onEnableGiftClaim && (
              <>
                <div className="magic-contract-divider">
                  <span>或</span>
                </div>
                <GiftContractSharePanel
                  card={card}
                  busy={busy}
                  onEnableGift={onEnableGiftClaim}
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
            onCompleteTask={onCompleteTask}
          />
        )}

        {phase === 'seal' && (
          <div className="magic-book-locked-placeholder" aria-hidden>
            <p>封印之中…</p>
          </div>
        )}
      </MagicBookShell>
      </div>

      {showTaskPanel && onCompleteTask && (
        <MagicGrimoireTaskPanel
          card={card}
          busy={busy}
          onCompleteTask={onCompleteTask}
        />
      )}
    </div>
  )
}
