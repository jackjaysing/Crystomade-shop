import { X, CircleHelp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MAGICIAN_LEVELS } from '../../constants/grimoire'
import {
  computeMagicianLevelProgress,
  formatMagicianCollectionHint,
  formatVipXp,
} from '../../lib/grimoireMagicianLevel'
import { magicianLevelCumulativePerks, magicianLevelPerkCells } from '../../lib/grimoireMagicianPerks'
import type { CrystalSoulCard } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface MagicianLevelPanelProps {
  cards: CrystalSoulCard[]
  meritXp?: number
  /** 累積實付消費（= 經驗值） */
  purchaseAmount?: number
  /** @deprecated 改傳 purchaseAmount */
  purchaseMeritCardCount?: number
  /** 會員中心：顯示開啟魔導書按鈕 */
  showGrimoireLink?: boolean
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
            <th scope="col">VIP</th>
            <th scope="col">等級</th>
            <th scope="col">累積消費</th>
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
                <td className="magician-perk-table-xp">
                  {item.minXp === 0 ? '—' : formatVipXp(item.minXp)}
                </td>
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
  purchaseAmount: number
}

function MagicianLevelLadderModal({
  open,
  onClose,
  currentTier,
  purchaseAmount,
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
        aria-label="關閉 VIP 等級說明"
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
            <p className="text-xs tracking-[0.35em] text-amber-glow/70">VIP LEVEL</p>
            <h2 id="magician-ladder-title" className="mt-2 font-display text-xl text-white">
              VIP 等級禮遇
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              經驗值依累積實付消費計算；點數折抵與點數兌換不計入。
            </p>
            <p className="mt-2 text-sm text-amber-glow/80">
              目前經驗值：{formatVipXp(purchaseAmount)}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <h3 className="magician-perk-table-heading">禮遇對照</h3>
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
                      <span className="magician-ladder-xp">
                        {item.minXp === 0 ? '入門' : formatVipXp(item.minXp)}
                      </span>
                    </div>
                    <p className="magician-ladder-flavor">{item.flavor}</p>
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

/** 會員 VIP 等級（魔導書書架頂部） */
export function MagicianLevelPanel({
  cards,
  meritXp = 0,
  purchaseAmount,
  purchaseMeritCardCount = 0,
  showGrimoireLink = false,
}: MagicianLevelPanelProps) {
  const [ladderOpen, setLadderOpen] = useState(false)
  const amount = purchaseAmount ?? purchaseMeritCardCount
  const progress = computeMagicianLevelProgress(cards, meritXp, amount)
  const { level, nextLevel, stats } = progress
  const atMaxLevel = !nextLevel
  const collectionHint = formatMagicianCollectionHint(progress)
  const activePerks = magicianLevelCumulativePerks(level.tier)

  return (
    <>
      <section
        className={`magician-level-panel magician-level-panel--tier-${level.tier}`}
        aria-label={`VIP 等級 ${level.title}`}
      >
        <div className="magician-level-panel-glow" aria-hidden />
        <div className="magician-level-panel-inner">
          <div className="magician-level-panel-head">
            <div className="magician-level-badge" aria-hidden>
              <span className="magician-level-badge-roman">{level.roman}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="magician-level-title-row">
                <p className="magician-level-eyebrow">VIP LEVEL · {level.title}</p>
                <button
                  type="button"
                  onClick={() => setLadderOpen(true)}
                  className="magician-level-info-btn"
                  aria-label="查看 VIP 等級禮遇"
                  title="查看 VIP 等級禮遇"
                >
                  <CircleHelp className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <h2 className="magician-level-title magic-foil-heading">{level.title}</h2>
              <p className="magician-level-epithet">{level.epithet}</p>
            </div>
            <div className="magician-level-xp text-right">
              <p className="magician-level-xp-label">經驗值</p>
              <p className="magician-level-xp-value text-base sm:text-lg">
                {formatVipXp(progress.totalXp)}
              </p>
              {showGrimoireLink ? (
                <Link
                  to="/account/grimoire"
                  className="magician-level-grimoire-link"
                >
                  開啟我的
                  <br />
                  水晶魔導書
                </Link>
              ) : null}
            </div>
          </div>

          {activePerks.length > 0 && (
            <ul className="magician-level-active-perks" aria-label="目前 VIP 禮遇">
              {activePerks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          )}

          {atMaxLevel ? (
            <p className="magician-level-max">已達最高 VIP 等級</p>
          ) : (
            <div className="magician-level-progress-wrap">
              <div className="magician-level-progress-meta">
                <span>距離 {nextLevel.title}</span>
                <span>還差 {formatVipXp(progress.amountToNextLevel ?? 0)}</span>
              </div>
              <div
                className="magician-level-progress-track"
                role="progressbar"
                aria-valuenow={progress.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`升級進度 ${progress.progressPercent}%`}
              >
                <div
                  className="magician-level-progress-fill"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {collectionHint && <p className="magician-level-collection-hint">{collectionHint}</p>}

          <dl className="magician-level-stats">
            <div>
              <dt>經驗值</dt>
              <dd className="text-sm">{formatVipXp(stats.purchaseAmount)}</dd>
            </div>
            <div>
              <dt>書架上</dt>
              <dd>{stats.bookCount}</dd>
            </div>
            <div>
              <dt>已簽約</dt>
              <dd>{stats.signedCount}</dd>
            </div>
            <div>
              <dt>待簽約</dt>
              <dd>{Math.max(0, stats.bookCount - stats.signedCount)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => setLadderOpen(true)}
            className="magician-level-info-btn mt-3 text-sm text-amber-glow/80 underline-offset-2 hover:underline"
          >
            查看 VIP 等級禮遇
          </button>

          {stats.purchaseAmount === 0 && (
            <p className="magician-level-hint">
              完成付款後會累積經驗值；出貨後才會出現魔法身分證。
            </p>
          )}
        </div>
      </section>

      <MagicianLevelLadderModal
        open={ladderOpen}
        onClose={() => setLadderOpen(false)}
        currentTier={level.tier}
        purchaseAmount={progress.totalXp}
      />
    </>
  )
}
