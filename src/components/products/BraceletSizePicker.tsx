import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BRACELET_SIZE_UNDECIDED,
  BRACELET_SIZES_CM,
} from '../../constants/braceletSizes'

interface BraceletSizePickerProps {
  value: string | null
  onChange: (size: string) => void
  /** 緊湊版（加購卡片） */
  compact?: boolean
  disabled?: boolean
}

/** 淨手圍測量教學內容 */
function WristMeasureGuideContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-white/75 sm:text-base">
      <p>
        請提供
        <span className="mx-0.5 font-medium text-amber-glow">「貼合皮膚」</span>
        的數值，不用自己預留空間，晶刻會幫你調好最舒服的鬆緊度唷！
      </p>
      <ol className="space-y-3">
        <li>
          <span className="font-medium text-white/90">1️⃣ 使用軟尺：</span>
          繞手腕骨頭最凸處一圈，貼合測量。
        </li>
        <li>
          <span className="font-medium text-white/90">2️⃣ 沒軟尺的話：</span>
          用「沒彈性的繩子」繞一圈，再平放用尺量長度。
        </li>
      </ol>
      <p className="rounded-lg border border-amber-glow/25 bg-amber-glow/10 px-3 py-2.5 text-amber-100/90">
        ⚠️ 注意：請提供公分數（cm），不要用力勒緊或自行加長喔！
      </p>
    </div>
  )
}

/** 手串淨手圍選擇 */
export function BraceletSizePicker({
  value,
  onChange,
  compact = false,
  disabled = false,
}: BraceletSizePickerProps) {
  const [guideOpen, setGuideOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!guideOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGuideOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [guideOpen])

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={
            compact
              ? 'text-xs font-medium tracking-wide text-amber-glow/90'
              : 'text-sm font-medium tracking-wide text-amber-glow'
          }
        >
          請選擇手圍
        </p>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          disabled={disabled}
          className={`rounded-full border border-amber-glow/35 px-2.5 text-amber-glow/90 transition hover:border-amber-glow/55 hover:bg-amber-glow/10 disabled:cursor-not-allowed disabled:opacity-40 ${
            compact ? 'py-0.5 text-[11px]' : 'py-1 text-xs sm:text-sm'
          }`}
        >
          淨手圍測量教學
        </button>
      </div>
      <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {BRACELET_SIZES_CM.map((size) => {
          const selected = value === size
          return (
            <button
              key={size}
              type="button"
              onClick={() => onChange(size)}
              disabled={disabled}
              className={`rounded-full border px-3 transition ${
                compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
              } ${
                selected
                  ? 'border-amber-glow bg-amber-glow/15 text-amber-glow'
                  : 'border-white/15 bg-white/5 text-white/70 hover:border-amber-glow/40 hover:text-amber-glow'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {size} cm
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onChange(BRACELET_SIZE_UNDECIDED)}
          disabled={disabled}
          className={`rounded-full border px-3 transition ${
            compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
          } ${
            value === BRACELET_SIZE_UNDECIDED
              ? 'border-amber-glow bg-amber-glow/15 text-amber-glow'
              : 'border-white/15 bg-white/5 text-white/70 hover:border-amber-glow/40 hover:text-amber-glow'
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          還不確定
        </button>
      </div>

      {guideOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={() => setGuideOpen(false)}
          >
            <div
              className="max-h-[min(85vh,640px)] w-full max-w-md overflow-y-auto rounded-xl border border-amber-glow/30 bg-[#16120e] p-5 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id={titleId}
                className="font-display text-xl tracking-wide text-amber-glow sm:text-2xl"
              >
                📏 淨手圍測量教學
              </h2>
              <div className="mt-4">
                <WristMeasureGuideContent />
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="mt-6 w-full rounded-lg border border-amber-glow/40 bg-amber-glow/15 py-3 text-base text-amber-glow transition hover:bg-amber-glow/25"
              >
                知道了
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
