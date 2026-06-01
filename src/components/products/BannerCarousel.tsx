import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnnouncementBanner } from '../../lib/types'

interface BannerCarouselProps {
  banners: AnnouncementBanner[]
}

/** 前台公告橫幅輪播（左右滑動） */
export function BannerCarousel({ banners }: BannerCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current
    if (!container || banners.length === 0) return

    const nextIndex = (index + banners.length) % banners.length
    const slide = container.children[nextIndex] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setActiveIndex(nextIndex)
  }, [banners.length])

  useEffect(() => {
    setActiveIndex(0)
    scrollRef.current?.scrollTo({ left: 0 })
  }, [banners])

  useEffect(() => {
    if (banners.length <= 1) return

    const timer = window.setInterval(() => {
      scrollToIndex(activeIndex + 1)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [activeIndex, banners.length, scrollToIndex])

  useEffect(() => {
    const container = scrollRef.current
    if (!container || banners.length === 0) return

    const handleScroll = () => {
      const slides = Array.from(container.children) as HTMLElement[]
      if (slides.length === 0) return

      const center = container.scrollLeft + container.clientWidth / 2
      let closest = 0
      let minDistance = Number.POSITIVE_INFINITY

      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.clientWidth / 2
        const distance = Math.abs(center - slideCenter)
        if (distance < minDistance) {
          minDistance = distance
          closest = index
        }
      })

      setActiveIndex(closest)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [banners.length])

  if (banners.length === 0) return null

  const hasMultiple = banners.length > 1

  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-lg border border-white/10 bg-graphite/40">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar scroll-smooth"
      >
        {banners.map((banner) => {
          const image = (
            <img
              src={banner.image_url}
              alt="公告橫幅"
              className="aspect-[3/1] w-full max-h-[216px] object-cover sm:max-h-[240px] md:max-h-[264px]"
              loading="lazy"
            />
          )

          return (
            <div
              key={banner.id}
              className="w-full shrink-0 snap-center"
            >
              {banner.link_url ? (
                <a
                  href={banner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
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
            onClick={() => scrollToIndex(activeIndex - 1)}
            className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-void/70 px-2 py-1 text-xs text-white/80 backdrop-blur-sm transition hover:text-white"
            aria-label="上一張橫幅"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-void/70 px-2 py-1 text-xs text-white/80 backdrop-blur-sm transition hover:text-white"
            aria-label="下一張橫幅"
          >
            ›
          </button>

          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => scrollToIndex(index)}
                className={`h-1.5 rounded-full transition ${
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
