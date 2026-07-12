import { useState } from 'react'

interface BeadThumbProps {
  imageUrl?: string | null
  name?: string
  elements?: string[]
  sizePx: number
  className?: string
  /** 選取／拖曳時加亮邊 */
  emphasize?: boolean
}

/**
 * 珠圖縮圖：淺底＋清楚邊框，避免透明 PNG／深色珠在黑底上看成黑塊；
 * 載入失敗時顯示五行字。
 */
export function BeadThumb({
  imageUrl,
  name = '',
  elements = [],
  sizePx,
  className = '',
  emphasize = false,
}: BeadThumbProps) {
  const [failed, setFailed] = useState(false)
  const showImg = Boolean(imageUrl?.trim()) && !failed

  if (!showImg) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border bg-[#2a231c] text-[10px] leading-tight text-amber-glow ${
          emphasize ? 'border-amber-glow' : 'border-amber-glow/45'
        } ${className}`}
        style={{ width: sizePx, height: sizePx }}
        title={name || undefined}
        aria-hidden={!name}
      >
        {elements[0] ?? '✦'}
      </div>
    )
  }

  return (
    <img
      src={imageUrl!}
      alt={name}
      draggable={false}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      className={`block shrink-0 rounded-full border object-cover ${
        emphasize
          ? 'border-amber-glow shadow-[0_0_14px_rgba(201,168,76,0.5)]'
          : 'border-amber-glow/50'
      } ${className}`}
      style={{
        width: sizePx,
        height: sizePx,
        backgroundColor: '#5c4e3d',
      }}
    />
  )
}
