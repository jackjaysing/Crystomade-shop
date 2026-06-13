import type { ImgHTMLAttributes } from 'react'

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** 首屏關鍵圖（Logo 等）優先載入 */
  priority?: boolean
}

/** 前台圖片：lazy + async decode（Vite 專案無 next/image，用原生 img 最佳化） */
export function OptimizedImage({
  priority = false,
  loading,
  decoding,
  fetchPriority,
  ...props
}: OptimizedImageProps) {
  return (
    <img
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      decoding={decoding ?? 'async'}
      fetchPriority={fetchPriority ?? (priority ? 'high' : undefined)}
      {...props}
    />
  )
}
