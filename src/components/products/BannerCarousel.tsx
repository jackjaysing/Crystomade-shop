import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnnouncementBanner } from '../../lib/types'

interface BannerCarouselProps {
  banners: AnnouncementBanner[]
}

const SWIPE_THRESHOLD = 48

/** 前台公告橫幅輪播（CSS 位移，避免手機整頁跳動） */
export function BannerCarousel({ banners }: BannerCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const pauseUntilRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const didSwipeRef = useRef(false)

  const goTo = useCallback(
    (index: number) => {
      if (banners.length === 0) return
      setActiveIndex((index + banners.length) % banners.length)
    },
    [banners.length]
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [banners])

  useEffect(() => {
    if (banners.length <= 1) return

    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return
      setActiveIndex((i) => (i + 1) % banners.length)
    }, 8000)

    return () => window.clearInterval(timer)
  }, [banners.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root || banners.length <= 1) return

    const handleTouchMove = (e: TouchEvent) => {
      const start = touchStartRef.current
      if (!start) return

      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y

      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        e.preventDefault()
      }
    }

    root.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => root.removeEventListener('touchmove', handleTouchMove)
  }, [banners.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
    didSwipeRef.current = false
    pauseUntilRef.current = Date.now() + 8000
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current
    if (!start || banners.length <= 1) {
      touchStartRef.current = null
      return
    }

    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      didSwipeRef.current = true
      if (dx < 0) {
        setActiveIndex((i) => (i + 1) % banners.length)
      } else {
        setActiveIndex((i) => (i - 1 + banners.length) % banners.length)
      }
    }

    touchStartRef.current = null
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    if (didSwipeRef.current) {
      e.preventDefault()
      didSwipeRef.current = false
    }
  }

  if (banners.length === 0) return null

  const hasMultiple = banners.length > 1

  return (
    <div
      ref={rootRef}
      className="relative mx-auto max-w-4xl touch-pan-y overflow-hidden rounded-lg border border-white/10 bg-graphite/40"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
      >
        {banners.map((banner) => {
          const image = (
            <img
              src={banner.image_url}
              alt="公告橫幅"
              className="aspect-[3/1] w-full max-h-[216px] object-cover sm:max-h-[240px] md:max-h-[264px]"
              loading="lazy"
              draggable={false}
            />
          )

          return (
            <div key={banner.id} className="w-full shrink-0">
              {banner.link_url ? (
                <a
                  href={banner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={handleLinkClick}
                >
                  {image}
                </a>
              ) : (
                image
              )}
            </div>
          )
        })}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-void/70 px-2 py-1 text-xs text-white/80 backdrop-blur-sm transition hover:text-white"
            aria-label="上一張橫幅"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-void/70 px-2 py-1 text-xs text-white/80 backdrop-blur-sm transition hover:text-white"
            aria-label="下一張橫幅"
          >
            ›
          </button>

          <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goTo(index)}
                className={`pointer-events-auto h-1.5 rounded-full transition ${
                  index === activeIndex
                    ? 'w-5 bg-amber-glow'
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`第 ${index + 1} 張橫幅`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
