import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt: string
  open: boolean
  onClose: () => void
}

/** 點擊圖片後全螢幕放大預覽 */
export function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`放大檢視：${alt}`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-graphite/90 p-2 text-white/70 transition hover:text-white"
        aria-label="關閉放大圖片"
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
