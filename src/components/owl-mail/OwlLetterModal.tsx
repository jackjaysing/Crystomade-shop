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

/** 展開的羊皮紙信件（可重複開啟） */
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
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-void/85 p-4 backdrop-blur-sm overscroll-none"
      role="dialog"
      aria-modal
      aria-labelledby="owl-letter-title"
      onClick={onClose}
    >
      <div
        className="owl-letter-unfurl relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-16 left-1/2 z-10 w-28 -translate-x-1/2 opacity-90">
          <OwlCourierArt className="h-auto w-full drop-shadow-lg" />
        </div>

        <article className="owl-parchment relative mt-8 overflow-hidden rounded-sm px-5 pb-8 pt-12 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-[#5c4030]/70 transition hover:bg-black/5 hover:text-[#5c4030]"
            aria-label="關閉信件"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <p className="font-display text-center text-xs tracking-[0.35em] text-[#8a6b45]/90">
            CRYSTOMADE · 貓頭鷹信使
          </p>
          <h2
            id="owl-letter-title"
            className="owl-letter-title mt-3 text-center text-2xl text-[#3d2a1a]"
          >
            {message.subject.trim() || '給你的一封信'}
          </h2>
          <p className="mt-2 text-center text-[11px] text-[#8a6b45]/80">
            {formatTime(message.created_at)}
            {message.sent_by_admin_name
              ? ` · ${message.sent_by_admin_name}`
              : ''}
          </p>

          <div className="mx-auto my-5 h-px w-24 bg-[#b8956a]/50" />

          <div
            className="max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain pr-1"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="owl-letter-sheet min-h-[7.4rem]">
              <p className="owl-letter-body">{message.body}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
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
          </div>
        </article>
      </div>
    </div>
  )
}
