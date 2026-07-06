import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface WatermarkedImageDownloadButtonProps {
  onDownload: () => Promise<void>
  disabled?: boolean
  label?: string
  compact?: boolean
}

const DOWNLOAD_TIMEOUT_MS = 60_000

/** 下載含 Crystomade 浮水印的圖片 */
export function WatermarkedImageDownloadButton({
  onDownload,
  disabled = false,
  label = '下載浮水印圖',
  compact = false,
}: WatermarkedImageDownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      setLoading(false)
    }
  }, [])

  const handleClick = async () => {
    if (loading) return
    setLoading(true)

    let timeoutId: number | null = null
    try {
      await Promise.race([
        onDownload(),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('下載逾時，請再試一次')),
            DOWNLOAD_TIMEOUT_MS
          )
        }),
      ])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '下載失敗，請稍後再試'
      window.alert(message)
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId)
      if (activeRef.current) setLoading(false)
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        title={label}
        className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-30"
        aria-label={label}
      >
        <Download className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-40"
    >
      <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      {loading ? '產生中…' : label}
    </button>
  )
}
