import { AlertTriangle, X } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel'

interface DeleteOwlMessageConfirmModalProps {
  subject: string
  deleting?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** 刪除貓頭鷹信件前確認（刪除後無法復原） */
export function DeleteOwlMessageConfirmModal({
  subject,
  deleting,
  onClose,
  onConfirm,
}: DeleteOwlMessageConfirmModalProps) {
  const title = subject.trim() || '給你的一封信'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal
      aria-labelledby="delete-owl-message-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={deleting ? undefined : onClose}
        aria-label="關閉"
      />

      <GlassPanel className="relative z-10 w-full max-w-sm p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <h2
              id="delete-owl-message-title"
              className="font-display text-lg text-red-200"
            >
              刪除信件
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white disabled:opacity-40"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/65">
          確定要刪除「
          <span className="text-amber-glow">{title}</span>
          」嗎？
        </p>
        <p className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-200/90">
          刪除後此信會從你的信件匣移除，且無法再打開。後台寄送紀錄仍會保留。
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-white/60 transition hover:text-white/80 disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg border border-red-400/50 bg-red-500/15 py-2.5 text-sm text-red-200 transition hover:bg-red-500/25 disabled:opacity-40"
          >
            {deleting ? '刪除中…' : '確認刪除'}
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
