import { useCallback, useState } from 'react'

/** 已被收藏標籤（質感外框） */
export function SoldOutCollectibleBadge({
  variant = 'card',
}: {
  variant?: 'card' | 'detail'
}) {
  return (
    <div
      className={`relative rounded-xl border border-amber-glow/45 ${
        variant === 'detail'
          ? 'border-amber-glow/40 bg-void/25 px-6 py-2.5 shadow-none backdrop-blur-[2px]'
          : 'bg-gradient-to-br from-void/85 via-void/70 to-void/85 px-6 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(212,165,116,0.08)] backdrop-blur-md'
      }`}
    >
      {variant === 'card' && (
        <>
          <span
            className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-amber-glow/20 via-transparent to-transparent opacity-60"
            aria-hidden
          />
        </>
      )}
      {variant === 'card' ? (
        <div className="relative text-center">
          <p className="font-display text-base tracking-[0.22em] text-amber-glow sm:text-lg">
            SOLD OUT
          </p>
          <p className="mt-1.5 text-[11px] tracking-[0.35em] text-white/75">
            已被收藏
          </p>
        </div>
      ) : (
        <p className="relative text-center font-display text-2xl tracking-[0.3em] text-amber-glow/90">
          已被收藏
        </p>
      )}
    </div>
  )
}

interface SoldOutImagePeekOptions {
  /** 未預覽時是否將圖片去色變暗（詳情頁預設關閉，維持原圖） */
  dimImage?: boolean
}

/** 滑鼠移入／手指按住時預覽原圖（隱藏已被收藏遮罩） */
export function useSoldOutImagePeek(
  enabled: boolean,
  options: SoldOutImagePeekOptions = {}
) {
  const { dimImage = false } = options
  const [peeking, setPeeking] = useState(false)

  const startPeek = useCallback(() => {
    if (enabled) setPeeking(true)
  }, [enabled])

  const endPeek = useCallback(() => {
    setPeeking(false)
  }, [])

  const peekHandlers = enabled
    ? {
        onMouseEnter: startPeek,
        onMouseLeave: endPeek,
        onTouchStart: startPeek,
        onTouchEnd: endPeek,
        onTouchCancel: endPeek,
      }
    : {}

  const imageClassName = enabled
    ? peeking
      ? dimImage
        ? 'grayscale-0 brightness-100 scale-[1.02]'
        : 'scale-[1.01]'
      : dimImage
        ? 'grayscale brightness-[0.72]'
        : ''
    : ''

  return { peeking, peekHandlers, imageClassName, endPeek }
}

interface SoldOutImageOverlayProps {
  visible: boolean
  variant?: 'card' | 'detail'
}

export function SoldOutImageOverlay({
  visible,
  variant = 'card',
}: SoldOutImageOverlayProps) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        variant === 'card' ? 'bg-void/55 backdrop-blur-[2px]' : 'bg-void/50'
      } ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!visible}
    >
      {variant === 'detail' ? (
        <SoldOutCollectibleBadge variant="detail" />
      ) : (
        <SoldOutCollectibleBadge variant="card" />
      )}
    </div>
  )
}
