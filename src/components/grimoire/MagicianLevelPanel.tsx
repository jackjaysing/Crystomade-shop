import { X, CircleHelp } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  GRIMOIRE_MERIT_PER_TASK,
  MAGICIAN_LEVELS,
  MAGICIAN_STAR_LABELS,
} from '../../constants/grimoire'
import {
  computeMagicianLevelProgress,
  formatMagicianCollectionHint,
} from '../../lib/grimoireMagicianLevel'
import { magicianLevelCumulativePerks, magicianLevelPerkCells } from '../../lib/grimoireMagicianPerks'
import type { CrystalSoulCard } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface MagicianLevelPanelProps {
  cards: CrystalSoulCard[]
  meritXp?: number
  /** 下單購入的修為本數（含已轉贈；轉贈後修為仍計入下單人） */
  purchaseMeritCardCount?: number
}

function MagicianLevelStars({
  stars,
  maxStars = 3,
}: {
  stars: number
  maxStars?: number
}) {
  return (
    <div className="magician-level-stars" aria-hidden>
      {Array.from({ length: maxStars }, (_, index) => (
        <span
          key={index}
          className={
            index < stars
              ? 'magician-level-star magician-level-star--on'
              : 'magician-level-star'
          }
        >
          ✦
        </span>
      ))}
    </div>
  )
}

function MagicianPerkCell({ value }: { value: string | null }) {
  if (!value) {
    return <span className="magician-perk-table-empty">—</span>
  }
  return <span className="magician-perk-table-cell">{value}</span>
}

function MagicianPerksTable({ currentTier }: { currentTier: number }) {
  return (
    <div className="magician-perk-table-wrap">
      <table className="magician-perk-table">
        <thead>
          <tr>
            <th scope="col">等級</th>
            <th scope="col">稱號</th>
            <th scope="col">修為</th>
            <th scope="col">能量加持</th>
            <th scope="col">生日禮</th>
            <th scope="col">免運額度</th>
          </tr>
        </thead>
        <tbody>
          {MAGICIAN_LEVELS.map((item) => {
            const state =
              item.tier < currentTier
                ? 'passed'
                : item.tier === currentTier
                  ? 'current'
                  : 'locked'
            const cells = magicianLevelPerkCells(item.tier)

            return (
              <tr
                key={item.tier}
                className={`magician-perk-table-row magician-perk-table-row--${state}`}
              >
                <td>
                  <span className="magician-perk-table-roman">{item.roman}</span>
                </td>
                <td>
                  <span className="magician-perk-table-title">{item.title}</span>
                  <span className="magician-perk-table-epithet">{item.epithet}</span>
                </td>
                <td className="magician-perk-table-xp">{item.minXp}</td>
                <td>
                  <MagicianPerkCell value={cells.blessing} />
                </td>
                <td>
                  <MagicianPerkCell value={cells.birthday} />
                </td>
                <td>
                  <MagicianPerkCell value={cells.shipping} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface MagicianLevelLadderModalProps {
  open: boolean
  onClose: () => void
  currentTier: number
  totalXp: number
}

function MagicianLevelLadderModal({
  open,
  onClose,
  currentTier,
  totalXp,
}: MagicianLevelLadderModalProps) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="magician-ladder-modal fixed inset-0 z-[58] flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="magician-ladder-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/85 backdrop-blur-sm"
        onClick={onClose}
        aria-label="關閉等級說明"
      />

      <div
        className="relative z-10 flex w-full max-w-3xl max-h-[min(88vh,44rem)] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassPanel className="relative flex min-h-0 flex-1 flex-col border-amber-glow/30 bg-void/92 p-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-void/80 text-white/70 transition hover:border-amber-glow/50 hover:text-amber-glow"
            aria-label="關閉"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <div className="border-b border-amber-glow/15 px-5 pb-4 pt-5 sm:px-6">
            <p className="text-[10px] tracking-[0.35em] text-amber-glow/70">WIZARD RANK</p>
            <h2 id="magician-ladder-title" className="mt-2 font-display text-xl text-white">
              魔法師等級總覽
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              共七階，每階三星。修為來自魔導書里程碑與極境後的日常修行。
            </p>
            <p className="mt-2 text-sm text-amber-glow/80">目前巫師修為：{totalXp}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <h3 className="magician-perk-table-heading">典藏禮遇對照</h3>
            <MagicianPerksTable currentTier={currentTier} />

            <h3 className="magician-ladder-section-heading">等級說明</h3>
            <ol className="magician-ladder-list">
            {MAGICIAN_LEVELS.map((item) => {
              const state =
                item.tier < currentTier
                  ? 'passed'
                  : item.tier === currentTier
                    ? 'current'
                    : 'locked'

              return (
                <li
                  key={item.tier}
                  className={`magician-ladder-item magician-ladder-item--${state}`}
                >
                  <div className="magician-ladder-item-head">
                    <span className="magician-ladder-roman">{item.roman}</span>
                    <div className="min-w-0 flex-1">
                      <p className="magician-ladder-title">{item.title}</p>
                      <p className="magician-ladder-epithet">{item.epithet}</p>
                    </div>
                    <span className="magician-ladder-xp">{item.minXp} 修為</span>
                  </div>
                  <p className="magician-ladder-flavor">{item.flavor}</p>
                  <p className="magician-ladder-stars">
                    {MAGICIAN_STAR_LABELS.join(' · ')}
                  </p>
                </li>
              )
            })}
            </ol>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

/** 會員魔法師等級（魔導書書架頂部） */
export function MagicianLevelPanel({
  cards,
  meritXp = 0,
  purchaseMeritCardCount = 0,
}: MagicianLevelPanelProps) {
  const [ladderOpen, setLadderOpen] = useState(false)
  const progress = computeMagicianLevelProgress(cards, meritXp, purchaseMeritCardCount)
  const { level, nextLevel, stats, stars, starLabel } = progress
  const atMaxLevel = !nextLevel
  const nextMilestoneLabel =
    stars < 3 ? MAGICIAN_STAR_LABELS[stars as 1 | 2] : nextLevel!.title
  const collectionHint = formatMagicianCollectionHint(progress)
  const activePerks = magicianLevelCumulativePerks(level.tier)

  return (
    <>
      <section
        className={`magician-level-panel magician-level-panel--tier-${level.tier}`}
        aria-label={`魔法師等級 ${level.title} ${starLabel}`}
      >
        <div className="magician-level-panel-glow" aria-hidden />
        <div className="magician-level-panel-inner">
          <div className="magician-level-panel-head">
            <div className="magician-level-badge" aria-hidden>
              <span className="magician-level-badge-roman">{level.roman}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="magician-level-title-row">
                <p className="magician-level-eyebrow">WIZARD RANK · Lv.{level.tier}</p>
                <button
                  type="button"
                  onClick={() => setLadderOpen(true)}
                  className="magician-level-info-btn"
                  aria-label="查看魔法師等級總覽"
                  title="等級總覽"
                >
                  <CircleHelp className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <h2 className="magician-level-title magic-foil-heading">{level.title}</h2>
              <div className="magician-level-star-row">
                <MagicianLevelStars stars={stars} />
                <p className="magician-level-star-label">{starLabel}</p>
              </div>
              <p className="magician-level-epithet">{level.epithet}</p>
            </div>
            <div className="magician-level-xp text-right">
              <p className="magician-level-xp-label">巫師修為</p>
              <p className="magician-level-xp-value">{progress.totalXp}</p>
              {progress.meritXp > 0 && (
                <p className="magician-level-xp-sub">含日常 +{progress.meritXp}</p>
              )}
              {progress.purchaseXp > 0 && (
                <p className="magician-level-xp-sub">含購入 +{progress.purchaseXp}</p>
              )}
            </div>
          </div>

        <p className="magician-level-flavor">{level.flavor}</p>

        {activePerks.length > 0 && (
          <ul className="magician-level-active-perks" aria-label="目前典藏禮遇">
            {activePerks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        )}

        {atMaxLevel ? (
            <p className="magician-level-max">已達傳說巔峰 · 永恆大魔導 · 三星</p>
          ) : (
            <div className="magician-level-progress-wrap">
              <div className="magician-level-progress-meta">
                <span>距離 {nextMilestoneLabel}</span>
                <span>
                  {progress.xpIntoStar} / {progress.xpForNextStar}
                </span>
              </div>
              <div
                className="magician-level-progress-track"
                role="progressbar"
                aria-valuenow={progress.starProgressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${starLabel}進度 ${progress.starProgressPercent}%`}
              >
                <div
                  className="magician-level-progress-fill"
                  style={{ width: `${progress.starProgressPercent}%` }}
                />
              </div>
              <div className="magician-level-star-steps" aria-hidden>
                {MAGICIAN_STAR_LABELS.map((label, index) => (
                  <span
                    key={label}
                    className={
                      index < stars
                        ? 'magician-level-star-step magician-level-star-step--on'
                        : 'magician-level-star-step'
                    }
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {collectionHint && <p className="magician-level-collection-hint">{collectionHint}</p>}

          <dl className="magician-level-stats">
            <div>
              <dt>魔導書</dt>
              <dd>{stats.bookCount}</dd>
            </div>
            <div>
              <dt>已簽契約</dt>
              <dd>{stats.signedCount}</dd>
            </div>
            <div>
              <dt>極境之書</dt>
              <dd>{stats.ascendantCount}</dd>
            </div>
            <div>
              <dt>日常修為</dt>
              <dd>
                {stats.meritXp > 0 ? `+${stats.meritXp}` : '—'}
                <span className="magician-level-stats-note">
                  （極境任務 +{GRIMOIRE_MERIT_PER_TASK}/次）
                </span>
              </dd>
            </div>
          </dl>

          {stats.bookCount === 0 && (
            <p className="magician-level-hint">
              收藏第一本魔導書後，修為將隨契約與滋養任務累積；練至極境約可達水晶行者。
              典藏四本極境之書，有機會晉升永恆大魔導。
            </p>
          )}
        </div>
      </section>

      <MagicianLevelLadderModal
        open={ladderOpen}
        onClose={() => setLadderOpen(false)}
        currentTier={level.tier}
        totalXp={progress.totalXp}
      />
    </>
  )
}
