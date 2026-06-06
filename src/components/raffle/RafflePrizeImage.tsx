import { useState } from 'react'
import { isBrowserDisplayableImageUrl } from '../../lib/browserImage'
import type { RaffleWithMeta } from '../../lib/types'
import { ImageLightbox } from '../ui/ImageLightbox'

interface RafflePrizeImageProps {
  raffle: RaffleWithMeta
  imageSize?: 'sm' | 'md'
  /** 前台：點擊放大預覽 */
  zoomable?: boolean
}

export function prizeNameRaw(raffle: RaffleWithMeta): string {
  return raffle.prize_title?.trim() || raffle.title
}

/** 前台／列表顯示用禮物名稱 */
export function prizeName(raffle: RaffleWithMeta): string {
  const raw = prizeNameRaw(raffle)
  return raw ? `【${raw}】` : ''
}

/** 抽獎獎品縮圖 */
export function RafflePrizeImage({
  raffle,
  imageSize = 'md',
  zoomable = false,
}: RafflePrizeImageProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const imageUrl = isBrowserDisplayableImageUrl(raffle.prize_image_url)
    ? raffle.prize_image_url
    : null
  const name = prizeName(raffle)
  const imageClass =
    imageSize === 'sm'
      ? 'h-16 w-16 shrink-0 rounded-lg object-cover'
      : 'h-24 w-24 shrink-0 rounded-xl object-cover'

  if (imageUrl && !imageFailed) {
    const image = (
      <img
        src={imageUrl}
        alt={name}
        className={`${imageClass} border border-white/10 bg-white/5`}
        onError={() => setImageFailed(true)}
      />
    )

    if (!zoomable) return image

    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="shrink-0 cursor-zoom-in rounded-lg transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow/50"
          aria-label={`放大檢視 ${name}`}
        >
          {image}
        </button>
        <ImageLightbox
          src={imageUrl}
          alt={name}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    )
  }

  return (
    <div
      className={`${imageClass} flex items-center justify-center border border-white/10 bg-white/5 text-xs text-white/30`}
      aria-hidden
    >
      獎品
    </div>
  )
}
