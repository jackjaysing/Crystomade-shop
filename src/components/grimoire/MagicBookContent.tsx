import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { crystalSoulCardPublicUrl } from '../../lib/grimoire'
import type { CrystalSoulCard } from '../../lib/types'
import { CrystalMagicIdCardFace } from './CrystalMagicIdCardFace'
import { GiftContractSharePanel } from './GiftContractSharePanel'

export type MagicBookMode = 'owner' | 'public'

interface MagicBookContentProps {
  card: CrystalSoulCard
  mode: MagicBookMode
  busy?: boolean
  onToggleShare?: (isPublic: boolean) => Promise<void>
  onTransferByPhone?: (phone: string, confirmCode: string) => Promise<void>
}

/** 魔導書內頁：燙金身分證 + 分享／轉送 */
export function MagicBookContent({
  card,
  mode,
  busy = false,
  onToggleShare,
  onTransferByPhone,
}: MagicBookContentProps) {
  const [copied, setCopied] = useState(false)
  const isOwner = mode === 'owner'
  const shareUrl = crystalSoulCardPublicUrl(card.public_slug)
  const signed = Boolean(card.contract_signed_at)

  const handleCopy = async () => {
    if (!card.is_public) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`magic-book-content magic-book-content--tier-${card.magic_status}`}>
      <CrystalMagicIdCardFace
        magicTitle={card.magic_title}
        productName={card.product_name}
        serialNumber={card.serial_number}
        magicAffiliation={card.magic_affiliation}
        elementPrimary={card.element_primary}
        productTags={card.product_tags}
        fiveElements={card.five_elements}
        magicBirthDate={card.magic_birth_date}
        productImageUrl={card.product_image_url}
        selectedSize={card.selected_size}
        signedStamp={signed}
      />

      {card.chakra && (
        <p className="magic-book-verse-label">脈輪 · {card.chakra}</p>
      )}

      {card.resonance_keyword && (
        <p className="magic-book-keyword">共鳴 · {card.resonance_keyword}</p>
      )}

      {card.awakening_verse && (
        <blockquote className="magic-book-quote">{card.awakening_verse}</blockquote>
      )}

      {signed && card.contract_signer_name && (
        <div className="magic-book-contract-stamp">
          <p className="magic-foil-text-subtle">契約簽署人</p>
          <p className="magic-book-contract-date">
            {new Date(card.contract_signed_at!).toLocaleDateString('zh-TW')}
            {` · ${card.contract_signer_name}`}
          </p>
        </div>
      )}

      {isOwner && onTransferByPhone && (
        <GiftContractSharePanel busy={busy} onTransfer={onTransferByPhone} />
      )}

      {isOwner && onToggleShare && (
        <div className="magic-book-owner-actions">
          <label className="magic-book-share-toggle">
            <input
              type="checkbox"
              checked={card.is_public}
              disabled={busy}
              onChange={(e) => void onToggleShare(e.target.checked)}
            />
            <span>開啟分享頁，供友人唯讀瀏覽</span>
          </label>
          {card.is_public && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCopy()}
              className="magic-book-copy-link"
            >
              <Link2 className="h-3.5 w-3.5" />
              {copied ? '連結已複製' : '複製分享連結'}
            </button>
          )}
        </div>
      )}

      {!isOwner && (
        <p className="magic-book-guest-note">友人分享 · 唯讀閱覽</p>
      )}
    </div>
  )
}
