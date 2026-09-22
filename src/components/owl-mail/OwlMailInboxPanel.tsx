import { useEffect } from 'react'
import { Trash2, X } from 'lucide-react'
import type { MemberOwlMessage } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface OwlMailInboxPanelProps {
  open: boolean
  messages: MemberOwlMessage[]
  loading: boolean
  onClose: () => void
  onOpenMessage: (message: MemberOwlMessage) => void
  onRequestDelete: (message: MemberOwlMessage) => void
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** 信件匣：已讀／未讀都會保留，可重複開啟，也可刪除 */
export function OwlMailInboxPanel({
  open,
  messages,
  loading,
  onClose,
  onOpenMessage,
  onRequestDelete,
}: OwlMailInboxPanelProps) {
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
      className="fixed inset-0 z-[55] flex items-end justify-start bg-void/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="owl-inbox-title"
      onClick={onClose}
    >
      <GlassPanel className="owl-inbox-panel relative mb-[max(5rem,env(safe-area-inset-bottom))] w-full max-w-md overflow-hidden sm:mb-0">
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <div className="owl-inbox-header flex items-start justify-between gap-3 border-b border-[#b8956a]/25 px-4 py-4 sm:px-5">
            <div>
              <p className="font-display text-[11px] tracking-[0.3em] text-amber-glow/70">
                貓頭鷹信使
              </p>
              <h2
                id="owl-inbox-title"
                className="font-display mt-1 text-xl text-amber-glow"
              >
                信件匣
              </h2>
              <p className="mt-1 text-[11px] text-white/40">
                可隨時重看；不需要的信件可自行刪除
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
              aria-label="關閉信件匣"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="max-h-[min(62vh,28rem)] overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
            {loading && messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">載入中…</p>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">
                尚無信件。有新信時貓頭鷹會飛來通知。
              </p>
            ) : (
              <ul className="space-y-2">
                {messages.map((msg) => {
                  const unread = msg.read_at == null
                  return (
                    <li key={msg.id}>
                      <div
                        className={`owl-inbox-row rounded-lg border px-3 py-3 ${
                          unread
                            ? 'border-amber-glow/40 bg-amber-glow/10'
                            : 'border-white/10 bg-white/[0.03]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenMessage(msg)}
                          className="w-full text-left transition hover:opacity-95"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`min-w-0 flex-1 truncate font-display text-[15px] ${
                                unread ? 'text-amber-glow' : 'text-white/80'
                              }`}
                            >
                              {msg.subject.trim() || '給你的一封信'}
                            </p>
                            {unread ? (
                              <span className="shrink-0 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[9px] font-medium text-white">
                                未讀
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] text-white/30">
                                已讀
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
                            {msg.body}
                          </p>
                          <p className="mt-1.5 text-[10px] text-white/30">
                            {formatTime(msg.created_at)}
                            {msg.sent_by_admin_name
                              ? ` · ${msg.sent_by_admin_name}`
                              : ''}
                          </p>
                        </button>
                        <div className="mt-2 flex justify-end border-t border-white/5 pt-2">
                          <button
                            type="button"
                            onClick={() => onRequestDelete(msg)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-red-300/80 transition hover:bg-red-500/10 hover:text-red-200"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                            刪除訊息
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
