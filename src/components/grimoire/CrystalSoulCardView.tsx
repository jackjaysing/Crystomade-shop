import { useState } from 'react'
import { Link2 } from 'lucide-react'
import {
  CRYSTAL_MAGIC_RANK,
  CRYSTAL_MAGIC_STATUS_LABELS,
} from '../../constants/grimoire'
import { crystalSoulCardPublicUrl } from '../../lib/grimoire'
import { nextRankLabel, tasksUntilNextRank } from '../../lib/grimoireRank'
import type { CrystalSoulCard } from '../../lib/types'
import { FiveElementsDisplay } from '../products/FiveElementsDisplay'
import type { FiveElement } from '../../constants/fiveElements'

export type CrystalSoulCardMode = 'owner' | 'public'

interface CrystalSoulCardProps {
  card: CrystalSoulCard
  mode?: CrystalSoulCardMode
  onToggleShare?: (isPublic: boolean) => Promise<void>
  busy?: boolean
}

export function CrystalSoulCardView({
  card,
  mode = 'owner',
  onToggleShare,
  busy = false,
}: CrystalSoulCardProps) {
  const [copied, setCopied] = useState(false)
  const isOwner = mode === 'owner'
  const shareUrl = crystalSoulCardPublicUrl(card.public_slug)
  const tasksRemaining = tasksUntilNextRank(
    card.magic_status,
    card.grimoire_task_count,
    Boolean(card.contract_signed_at)
  )
  const nextRank = nextRankLabel(card.magic_status)

  const handleCopyLink = async () => {
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
    <article className="relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-graphite/90 via-violet-950/30 to-graphite/90 p-5 shadow-[0_0_40px_rgba(139,92,246,0.12)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

      <header className="flex items-start gap-4">
        {card.product_image_url ? (
          <img
            src={card.product_image_url}
            alt={card.product_name}
            className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-2xl text-violet-300/60">
            ✦
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.35em] text-violet-300/70">
            CRYSTAL SOUL ID
          </p>
          <h3 className="mt-1 font-display text-lg text-white">{card.magic_title}</h3>
          <p className="mt-0.5 truncate text-sm text-white/55">{card.product_name}</p>
          {card.selected_size && (
            <p className="text-xs text-white/35">尺寸 {card.selected_size}</p>
          )}
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] tracking-widest text-white/35">序號</dt>
          <dd className="mt-0.5 font-mono text-xs text-amber-glow/90">{card.serial_number}</dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-widest text-white/35">魔法系別</dt>
          <dd className="mt-0.5 text-white/80">{card.magic_affiliation}</dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-widest text-white/35">主屬性</dt>
          <dd className="mt-0.5 text-lg text-violet-200">{card.element_primary}</dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-widest text-white/35">狀態</dt>
          <dd className="mt-0.5 text-white/80">
            {CRYSTAL_MAGIC_STATUS_LABELS[card.magic_status]}
          </dd>
        </div>
      </dl>

      {card.five_elements.length > 0 && (
        <div className="mt-3">
          <FiveElementsDisplay elements={card.five_elements as FiveElement[]} />
        </div>
      )}

      {card.chakra && (
        <p className="mt-3 text-xs text-white/45">脈輪 · {card.chakra}</p>
      )}

      {card.resonance_keyword && (
        <p className="mt-2 text-xs text-violet-200/70">
          共鳴關鍵字 · {card.resonance_keyword}
        </p>
      )}

      {card.awakening_verse && (
        <blockquote className="mt-3 border-l-2 border-violet-400/40 pl-3 text-sm italic text-white/60">
          {card.awakening_verse}
        </blockquote>
      )}

      {isOwner && onToggleShare && (
        <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm text-white/70">允許友人透過連結瀏覽</span>
            <input
              type="checkbox"
              checked={card.is_public}
              disabled={busy}
              onChange={(e) => void onToggleShare(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-violet-400"
            />
          </label>

          {card.is_public && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[11px] text-white/35" title={shareUrl}>
                {shareUrl}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCopyLink()}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:border-violet-400/40 hover:text-violet-200 disabled:opacity-50"
              >
                <Link2 className="h-3.5 w-3.5" />
                {copied ? '已複製' : '複製連結'}
              </button>
            </div>
          )}
        </div>
      )}

      {isOwner && tasksRemaining !== null && nextRank && (
        <p className="mt-4 text-center text-sm text-amber-glow/75">
          累積修行 {card.grimoire_task_count} 次 · 距離「{nextRank}」還需 {tasksRemaining} 次
        </p>
      )}

      {isOwner && card.magic_status === 'ascendant' && (
        <p className="mt-4 text-center text-sm text-amber-glow/75">
          已達極境 · {CRYSTAL_MAGIC_RANK.ascendant.epithet}
        </p>
      )}

      {!isOwner && (
        <p className="mt-4 text-center text-[11px] text-white/30">
          友人分享 · 唯讀瀏覽
        </p>
      )}
    </article>
  )
}
