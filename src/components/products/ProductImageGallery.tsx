import { useEffect, useState } from 'react'
import { getProductImages } from '../../lib/productImages'
import type { Product } from '../../lib/types'
import { ProductImageBadges } from './ProductImageBadges'
import { ProductImageMagnifier } from './ProductImageMagnifier'
import {
  SoldOutImageOverlay,
  useSoldOutImagePeek,
} from './SoldOutCollectible'

interface ProductImageGalleryProps {
  product: Product
  isSold: boolean
}

/** 商品詳情：封面 + 多張相簿切換 */
export function ProductImageGallery({ product, isSold }: ProductImageGalleryProps) {
  const images = getProductImages(product)
  const [activeIndex, setActiveIndex] = useState(0)
  const { peeking, peekHandlers, imageClassName, endPeek } = useSoldOutImagePeek(
    isSold,
    { dimImage: false }
  )

  useEffect(() => {
    setActiveIndex(0)
    endPeek()
  }, [product.id, endPeek])

  const hasMultiple = images.length > 1
  const activeSrc = images[activeIndex] ?? product.image_url

  const goPrev = () => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length)
  }

  const goNext = () => {
    setActiveIndex((i) => (i + 1) % images.length)
  }

  return (
    <div className="relative w-full overflow-hidden rounded-t-2xl bg-graphite">
      <div
        className="relative flex min-h-[240px] max-h-[min(55vh,520px)] w-full items-center justify-center overflow-hidden px-2 py-3"
        {...peekHandlers}
      >
        <ProductImageMagnifier
          src={activeSrc}
          alt={`${product.name} ${activeIndex + 1}`}
          className={imageClassName}
          enabled={!isSold || peeking}
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-void/60 px-3 py-2 text-white/80 backdrop-blur-sm transition hover:text-white"
              aria-label="上一張"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-void/60 px-3 py-2 text-white/80 backdrop-blur-sm transition hover:text-white"
              aria-label="下一張"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-void/70 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}

        {activeIndex === 0 && (
          <span className="absolute left-3 top-3 rounded-full border border-amber-glow/40 bg-void/70 px-2.5 py-1 text-[10px] tracking-wider text-amber-glow backdrop-blur-sm">
            封面
          </span>
        )}

        <ProductImageBadges product={product} surface="detail" />

        {isSold && (
          <SoldOutImageOverlay visible={!peeking} variant="detail" />
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto border-t border-white/5 bg-void/40 p-3">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-void/60 transition ${
                index === activeIndex
                  ? 'border-amber-glow'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-contain"
              />
              {index === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-void/80 py-0.5 text-[8px] text-amber-glow">
                  封面
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
