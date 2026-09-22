import { OwlCourierArt } from './OwlCourierArt'

interface OwlCourierArrivalProps {
  phase: 'fly-in' | 'idle' | 'fly-away'
  unreadCount: number
  onOpen: () => void
  onDismiss: () => void
}

/** 新信抵達：貓頭鷹由遠而近飛入，接近滿版 */
export function OwlCourierArrival({
  phase,
  unreadCount,
  onOpen,
  onDismiss,
}: OwlCourierArrivalProps) {
  return (
    <div
      className={`owl-arrival-overlay fixed inset-0 z-[58] flex flex-col items-center justify-center ${
        phase === 'fly-in'
          ? 'owl-arrival-enter'
          : phase === 'fly-away'
            ? 'owl-arrival-exit'
            : 'owl-arrival-hold'
      }`}
      role="dialog"
      aria-modal
      aria-label="貓頭鷹信使送來新信件"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-void/75 backdrop-blur-[2px]"
        aria-label="關閉動畫"
        onClick={onDismiss}
      />

      <button
        type="button"
        onClick={onOpen}
        className="owl-arrival-stage relative z-10 flex max-h-[92vh] w-[min(96vw,920px)] flex-col items-center outline-none"
        aria-label={
          unreadCount > 0
            ? `貓頭鷹送來 ${unreadCount} 封信，點擊開啟`
            : '開啟信件匣'
        }
      >
        <span className="owl-arrival-glow pointer-events-none absolute inset-[8%] rounded-full bg-amber-glow/10 blur-3xl" />
        <OwlCourierArt className="owl-arrival-bird relative z-10 h-auto max-h-[78vh] w-full drop-shadow-[0_20px_60px_rgba(0,0,0,0.65)]" />
        <span className="owl-arrival-caption relative z-10 mt-3 rounded-full border border-amber-glow/40 bg-void/80 px-5 py-2 font-display text-sm tracking-[0.2em] text-amber-glow backdrop-blur-md sm:text-base">
          {unreadCount > 1 ? `新信件 × ${unreadCount}` : '新信件抵達'}
          <span className="mt-0.5 block text-center text-[11px] font-sans tracking-normal text-white/55">
            點擊開啟信件匣
          </span>
        </span>
      </button>
    </div>
  )
}
