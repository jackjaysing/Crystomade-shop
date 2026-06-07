import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { shareProduct, type ProductShareResult } from '../../lib/shareProduct'
import type { Product } from '../../lib/types'

interface ProductShareButtonProps {
  product: Product
}

const FEEDBACK_MESSAGES: Partial<Record<ProductShareResult, string>> = {
  copied: '連結已複製，可貼到 LINE 或社群分享',
  failed: '無法分享，請稍後再試',
}

/** 商品詳情頁分享按鈕 */
export function ProductShareButton({ product }: ProductShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    if (sharing) return

    setSharing(true)
    setFeedback(null)

    try {
      const result = await shareProduct(product)
      const message = FEEDBACK_MESSAGES[result]
      if (message) {
        setFeedback(message)
        window.setTimeout(() => setFeedback(null), 2800)
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={sharing}
        aria-label={`分享商品：${product.name}`}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-3.5 py-2 text-sm text-white/70 transition hover:border-amber-glow/40 hover:bg-amber-glow/10 hover:text-amber-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {sharing ? '分享中…' : '分享'}
      </button>
      {feedback && (
        <p className="max-w-[12rem] text-right text-xs text-emerald-400/90">
          {feedback}
        </p>
      )}
    </div>
  )
}
