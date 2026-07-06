import { useState } from 'react'
import { Link2, Gift } from 'lucide-react'
import { crystalSoulCardGiftClaimUrl } from '../../lib/grimoire'
import type { CrystalSoulCard } from '../../lib/types'

interface GiftContractSharePanelProps {
  card: CrystalSoulCard
  busy?: boolean
  onEnableGift: () => Promise<void>
}

/** 下單人：產生贈送契約連結給朋友簽署 */
export function GiftContractSharePanel({
  card,
  busy = false,
  onEnableGift,
}: GiftContractSharePanelProps) {
  const [copied, setCopied] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const giftSlug = card.gift_claim_slug
  const giftUrl = giftSlug ? crystalSoulCardGiftClaimUrl(giftSlug) : null

  const handleEnable = async () => {
    setEnabling(true)
    try {
      await onEnableGift()
    } finally {
      setEnabling(false)
    }
  }

  const handleCopy = async () => {
    if (!giftUrl) return
    try {
      await navigator.clipboard.writeText(giftUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="magic-gift-panel">
      <div className="magic-gift-panel-header">
        <Gift className="magic-gift-panel-icon h-4 w-4" />
        <h4 className="magic-gift-panel-title">轉贈朋友簽署契約</h4>
      </div>
      <p className="magic-gift-panel-desc">
        若要將此本魔導書送給朋友簽署契約，可產生專屬連結。朋友登入後簽署能量契約，魔導書將轉入朋友的帳戶。
      </p>

      {giftUrl ? (
        <div className="magic-gift-link-box">
          <p className="magic-gift-link-url" title={giftUrl}>
            {giftUrl}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCopy()}
            className="magic-gift-copy-btn"
          >
            <Link2 className="h-3.5 w-3.5" />
            {copied ? '已複製' : '複製贈送連結'}
          </button>
          <p className="magic-gift-hint">
            連結在朋友完成簽署前有效。請勿自行開啟此連結簽署。
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || enabling}
          onClick={() => void handleEnable()}
          className="magic-gift-enable-btn"
        >
          {enabling ? '符文生成中…' : '產生贈送契約連結'}
        </button>
      )}
    </section>
  )
}
