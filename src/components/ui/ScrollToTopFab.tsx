import { useEffect, useState, type RefObject } from 'react'
import { ChevronUp } from 'lucide-react'

const SHOW_AFTER_PX = 320

interface ScrollToTopFabProps {
  /** 捲動目標；未指定則回到頁面頂部 */
  targetRef?: RefObject<HTMLElement | null>
  className?: string
}

/** 右側懸浮：一鍵回到商品／頁面頂部 */
export function ScrollToTopFab({ targetRef, className = '' }: ScrollToTopFabProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleClick = () => {
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-amber-glow/40 bg-graphite/90 text-amber-glow shadow-[0_4px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(212,165,116,0.15)] backdrop-blur-md transition hover:border-amber-glow/70 hover:bg-amber-glow/15 hover:text-white sm:right-6 ${className}`}
      style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="回到商品頂部"
      title="回到商品頂部"
    >
      <ChevronUp className="h-5 w-5" strokeWidth={2} aria-hidden />
    </button>
  )
}
