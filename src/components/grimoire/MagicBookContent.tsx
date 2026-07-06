import { Link2 } from 'lucide-react'
import { useState } from 'react'
import {
  CRYSTAL_MAGIC_RANK,
  CRYSTAL_MAGIC_STATUS_LABELS,
} from '../../constants/grimoire'
import { crystalSoulCardPublicUrl } from '../../lib/grimoire'
import type { CrystalSoulCard } from '../../lib/types'
import type { FiveElement } from '../../constants/fiveElements'
import type { GrimoireTaskType } from '../../constants/grimoire'
import { formatEfficacyTags } from '../../lib/efficacyTags'
import { MagicEnergyMeter } from './MagicEnergyMeter'
import { MagicRankBadge } from './MagicRankBadge'
import { MagicRankLadder } from './MagicRankLadder'

function formatMagicBirthDate(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split('-')
  if (parts.length !== 3) return isoDate
  const [y, m, d] = parts
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

export type MagicBookMode = 'owner' | 'public'

interface MagicBookContentProps {
  card: CrystalSoulCard
  mode: MagicBookMode
  busy?: boolean
  onToggleShare?: (isPublic: boolean) => Promise<void>
  onCompleteTask?: (task: GrimoireTaskType) => Promise<void>
}

function BookFiveElements({ elements }: { elements: FiveElement[] }) {
  const active = new Set(elements)
  const all: FiveElement[] = ['金', '木', '水', '火', '土']
  return (
    <div className="magic-book-elements" role="list" aria-label="五行屬性">
      {all.map((el) => (
        <span
          key={el}
          role="listitem"
          className={active.has(el) ? 'magic-book-element-active' : 'magic-book-element'}
        >
          {el}
        </span>
      ))}
    </div>
  )
}

/** 魔導書內頁內容 */
export function MagicBookContent({
  card,
  mode,
  busy = false,
  onToggleShare,
}: MagicBookContentProps) {
  const [copied, setCopied] = useState(false)
  const isOwner = mode === 'owner'
  const shareUrl = crystalSoulCardPublicUrl(card.public_slug)
  const rank = CRYSTAL_MAGIC_RANK[card.magic_status]

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
      <MagicRankBadge status={card.magic_status} />
      <MagicRankLadder current={card.magic_status} />
      <p className="magic-rank-flavor">{rank.flavor}</p>

      <div className="magic-id-divider" aria-hidden />

      <div className="magic-book-hero">
        {card.product_image_url ? (
          <div className={`magic-book-crystal-frame magic-book-crystal-frame--${card.magic_status}`}>
            <img
              src={card.product_image_url}
              alt={card.product_name}
              className="magic-book-crystal-img"
            />
          </div>
        ) : (
          <div className="magic-book-crystal-placeholder">✦</div>
        )}
        <div className="magic-book-hero-text">
          <p className="magic-book-chapter magic-foil-text-subtle">SOUL IMPRINT · 靈魂印記</p>
          <h3 className="magic-book-name magic-foil-text">{card.magic_title}</h3>
          <p className="magic-book-product">{card.product_name}</p>
          {card.selected_size && (
            <p className="magic-book-meta">尺寸 · {card.selected_size}</p>
          )}
        </div>
      </div>

      {!isOwner && (
        <MagicEnergyMeter card={card} interactive={false} showTasks={false} />
      )}

      <dl className="magic-book-stats">
        <div>
          <dt>序號</dt>
          <dd className="magic-book-serial">{card.serial_number}</dd>
        </div>
        {card.magic_birth_date && (
          <div>
            <dt>出生日期</dt>
            <dd>{formatMagicBirthDate(card.magic_birth_date)}</dd>
          </div>
        )}
        <div>
          <dt>魔法系別</dt>
          <dd>{card.magic_affiliation}</dd>
        </div>
        <div>
          <dt>主屬性</dt>
          <dd className="magic-book-primary">{card.element_primary}</dd>
        </div>
        <div>
          <dt>功效類別</dt>
          <dd>{formatEfficacyTags(card.product_tags)}</dd>
        </div>
        <div>
          <dt>覺醒狀態</dt>
          <dd className={`magic-book-status magic-book-status--${card.magic_status}`}>
            {CRYSTAL_MAGIC_STATUS_LABELS[card.magic_status]}
          </dd>
        </div>
      </dl>

      {card.five_elements.length > 0 && (
        <div className="magic-book-section">
          <p className="magic-book-section-label">五行印記</p>
          <BookFiveElements elements={card.five_elements as FiveElement[]} />
        </div>
      )}

      {card.chakra && (
        <p className="magic-book-verse-label">脈輪 · {card.chakra}</p>
      )}

      {card.resonance_keyword && (
        <p className="magic-book-keyword">共鳴 · {card.resonance_keyword}</p>
      )}

      {card.awakening_verse && (
        <blockquote className="magic-book-quote">{card.awakening_verse}</blockquote>
      )}

      {card.contract_signed_at && (
        <div className="magic-book-contract-stamp">
          <p className="magic-foil-text-subtle">契約已締結</p>
          <p className="magic-book-contract-date">
            {new Date(card.contract_signed_at).toLocaleDateString('zh-TW')}
            {card.contract_signer_name ? ` · ${card.contract_signer_name}` : ''}
          </p>
        </div>
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
              {copied ? '連結已複製' : '複製魔法頁面連結'}
            </button>
          )}
        </div>
      )}

      {!isOwner && (
        <p className="magic-book-guest-note">友人分享 · 唯讀閱覽，無法操作能量儀式</p>
      )}
    </div>
  )
}
