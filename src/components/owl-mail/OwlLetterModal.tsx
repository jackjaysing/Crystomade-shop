import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { MemberOwlMessage } from '../../lib/types'
import { OwlCourierArt } from './OwlCourierArt'

interface OwlLetterModalProps {
  message: MemberOwlMessage
  onClose: () => void
  onBackToInbox?: () => void
  onRequestDelete?: () => void
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** 展開的羊皮紙信件：整框固定在視窗內，僅內文捲動 */
export function OwlLetterModal({
  message,
  onClose,
  onBackToInbox,
  onRequestDelete,
}: OwlLetterModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-void/85 p-3 backdrop-blur-sm overscroll-none sm:p-4"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
      role="dialog"
      aria-modal
      aria-labelledby="owl-letter-title"
      onClick={onClose}
    >
      <div
        className="owl-letter-unfurl flex w-full max-w-md flex-col overflow-hidden"
        style={{
          maxHeight:
            'calc(100dvh - max(1.5rem, env(safe-area-inset-top)) - max(1.5rem, env(safe-area-inset-bottom)))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none relative z-20 mx-auto w-[4.5rem] shrink-0 sm:w-24">
          <OwlCourierArt className="h-auto w-full drop-shadow-lg" />
        </div>

        <article className="owl-parchment relative z-10 mt-[-1.25rem] flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm px-4 pb-5 pt-9 sm:mt-[-1.75rem] sm:px-7 sm:pb-7 sm:pt-11">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-[#5c4030]/70 transition hover:bg-black/5 hover:text-[#5c4030]"
            aria-label="關閉信件"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <header className="shrink-0 pr-6">
            <p className="font-display text-center text-[10px] tracking-[0.35em] text-[#8a6b45]/90 sm:text-xs">
              CRYSTOMADE · 貓頭鷹信使
            </p>
            <h2
              id="owl-letter-title"
              className="owl-letter-title mt-2 text-center text-xl leading-snug text-[#3d2a1a] sm:mt-3 sm:text-2xl"
            >
              {message.subject.trim() || '給你的一封信'}
            </h2>
            <p className="mt-1.5 text-center text-[10px] text-[#8a6b45]/80 sm:text-[11px]">
              {formatTime(message.created_at)}
              {message.sent_by_admin_name
                ? ` · ${message.sent_by_admin_name}`
                : ''}
            </p>
            <div className="mx-auto my-3 h-px w-20 bg-[#b8956a]/50 sm:my-4 sm:w-24" />
          </header>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="owl-letter-sheet min-h-[4rem]">
              <p className="owl-letter-body">{message.body}</p>
            </div>
          </div>

          <footer className="mt-4 flex shrink-0 flex-col items-center gap-1.5 sm:mt-5 sm:gap-2">
            {onBackToInbox ? (
              <button
                type="button"
                onClick={onBackToInbox}
                className="rounded-full border border-[#8a6b45]/40 bg-[#c4a574]/25 px-5 py-2 text-sm text-[#3d2a1a] transition hover:bg-[#c4a574]/40"
              >
                回到信件匣
              </button>
            ) : null}
            {onRequestDelete ? (
              <button
                type="button"
                onClick={onRequestDelete}
                className="text-sm text-[#a65c4a] underline-offset-2 hover:underline"
              >
                刪除訊息
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#8a6b45] underline-offset-2 hover:underline"
            >
              收起卷軸
            </button>
          </footer>
        </article>
      </div>
    </div>
  )
}
