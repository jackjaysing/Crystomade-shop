import { useEffect } from 'react'

interface ToastProps {
  message: string | null
  onDismiss: () => void
  durationMs?: number
}

/** 畫面底部短暫提示 */
export function Toast({ message, onDismiss, durationMs = 2600 }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss, durationMs])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-8 left-1/2 z-[200] -translate-x-1/2 px-4"
    >
      <p className="rounded-full border border-amber-glow/40 bg-void/95 px-5 py-2.5 text-sm tracking-wide text-amber-glow shadow-lg shadow-black/40 backdrop-blur-md">
        {message}
      </p>
    </div>
  )
}
