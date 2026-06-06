import { RAFFLE_GIFT_DISPLAY_NOTE } from '../../constants/raffles'
import type { RaffleWithMeta } from '../../lib/types'
import { RaffleListedCode } from './RaffleListedCode'
import { RafflePrizeImage, prizeName } from './RafflePrizeImage'

interface RafflePrizeDisplayProps {
  raffle: RaffleWithMeta
  /** 圖片尺寸 */
  imageSize?: 'sm' | 'md'
}

/** 前台抽獎獎品展示：禮物圖、禮物名稱、固定隨單送說明 */
export function RafflePrizeDisplay({
  raffle,
  imageSize = 'md',
}: RafflePrizeDisplayProps) {
  const name = prizeName(raffle)
  const description = raffle.description.trim()

  return (
    <div className="flex gap-3">
      <RafflePrizeImage raffle={raffle} imageSize={imageSize} zoomable />
      <div className="min-w-0 flex-1">
        <RaffleListedCode code={raffle.listed_code} />
        <p className="mt-1 font-medium text-white">{name}</p>
        {description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/55">
            {description}
          </p>
        )}
        <p className="mt-1 text-sm text-amber-glow/85">{RAFFLE_GIFT_DISPLAY_NOTE}</p>
      </div>
    </div>
  )
}
