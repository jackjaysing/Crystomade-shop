import { ChevronLeft, ChevronRight } from 'lucide-react'

import {

  forwardRef,

  useCallback,

  useEffect,

  useRef,

  useState,

} from 'react'

import { getBraceletStyleLabel } from '../../constants/braceletStyles'
import { getCategoryLabel } from '../../constants/categories'

import type { BraceletStyle, Product, ProductCategory } from '../../lib/types'
import { BraceletStyleFilter } from './BraceletStyleFilter'
import { ProductCard } from './ProductCard'



interface CategoryProductRowProps {
  category: ProductCategory
  products: Product[]
  onProductClick: (product: Product) => void
  activeBraceletStyle?: BraceletStyle | null
  onBraceletStyleSelect?: (style: BraceletStyle | null) => void
}



/** 對齊商品圖 aspect-[3/4] 的垂直中央（w-44→11rem、sm:w-52…） */
const NAV_BUTTON_SLOT_CLASS =
  'pointer-events-none absolute z-30 -translate-y-1/2 top-[calc(11rem*2/3)] sm:top-[calc(13rem*2/3)] md:top-[calc(14rem*2/3)] lg:top-[calc(15rem*2/3)]'

const ARROW_SCROLL_DURATION_MS = 240

const WHEEL_STEP_THRESHOLD = 36



function easeOutCubic(progress: number): number {

  return 1 - Math.pow(1 - progress, 3)

}



function getCardStep(track: HTMLDivElement): number {

  const card = track.querySelector<HTMLElement>('[data-carousel-card]')

  if (!card) return Math.max(track.clientWidth * 0.85, 240)



  const styles = getComputedStyle(track)

  const gap = Number.parseFloat(styles.columnGap || styles.gap || '16') || 16

  return card.offsetWidth + gap

}



function clampScrollLeft(track: HTMLDivElement, nextLeft: number): number {

  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)

  return Math.max(0, Math.min(maxScroll, nextLeft))

}



function prefersFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches
}

function getWheelDelta(event: WheelEvent): number {

  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {

    return event.deltaX

  }



  const scale =

    event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? trackFallbackScale(event) : 1



  return event.deltaY * scale

}



function trackFallbackScale(event: WheelEvent): number {

  const target = event.currentTarget

  if (target instanceof HTMLElement) {

    return Math.min(target.clientWidth * 0.5, 320)

  }

  return 240

}



function RowNavButton({

  direction,

  onClick,

  disabled,

}: {

  direction: 'prev' | 'next'

  onClick: () => void

  disabled: boolean

}) {

  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight

  const label = direction === 'prev' ? '上一組商品' : '下一組商品'



  return (

    <button

      type="button"

      onClick={onClick}

      disabled={disabled}

      aria-label={label}

      className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border bg-void/85 text-amber-glow shadow-[0_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm transition sm:h-11 sm:w-11 ${

        disabled

          ? 'pointer-events-none border-white/10 text-white/20 opacity-40'

          : 'border-amber-glow/45 hover:border-amber-glow/70 hover:bg-amber-glow/10'

      }`}

    >

      <Icon className="h-5 w-5" strokeWidth={1.75} />

    </button>

  )

}



/** 單一品類橫向商品列（箭頭／滾輪切換） */

export const CategoryProductRow = forwardRef<HTMLElement, CategoryProductRowProps>(

  function CategoryProductRow(
    {
      category,
      products,
      onProductClick,
      activeBraceletStyle = null,
      onBraceletStyleSelect,
    },
    ref
  ) {

    const sectionRef = useRef<HTMLElement | null>(null)

    const trackRef = useRef<HTMLDivElement>(null)

    const scrollRafRef = useRef<number | null>(null)

    const arrowAnimRafRef = useRef<number | null>(null)

    const wheelAccumRef = useRef(0)

    const [canScrollLeft, setCanScrollLeft] = useState(false)

    const [canScrollRight, setCanScrollRight] = useState(false)



    const updateNavState = useCallback(() => {

      const track = trackRef.current

      if (!track) return

      const maxScroll = track.scrollWidth - track.clientWidth

      setCanScrollLeft(track.scrollLeft > 4)

      setCanScrollRight(maxScroll > 4 && track.scrollLeft < maxScroll - 4)

    }, [])



    const scheduleNavStateUpdate = useCallback(() => {

      if (scrollRafRef.current !== null) return

      scrollRafRef.current = requestAnimationFrame(() => {

        updateNavState()

        scrollRafRef.current = null

      })

    }, [updateNavState])



    const cancelArrowAnimation = useCallback(() => {

      if (arrowAnimRafRef.current !== null) {

        cancelAnimationFrame(arrowAnimRafRef.current)

        arrowAnimRafRef.current = null

      }

    }, [])



    const animateScrollTo = useCallback(

      (targetLeft: number, duration = ARROW_SCROLL_DURATION_MS) => {

        const track = trackRef.current

        if (!track) return



        cancelArrowAnimation()



        const startLeft = track.scrollLeft

        const distance = clampScrollLeft(track, targetLeft) - startLeft

        if (Math.abs(distance) < 0.5) return



        const startTime = performance.now()



        const step = (now: number) => {

          const progress = Math.min((now - startTime) / duration, 1)

          track.scrollLeft = startLeft + distance * easeOutCubic(progress)

          scheduleNavStateUpdate()



          if (progress < 1) {

            arrowAnimRafRef.current = requestAnimationFrame(step)

          } else {

            arrowAnimRafRef.current = null

            updateNavState()

          }

        }



        arrowAnimRafRef.current = requestAnimationFrame(step)

      },

      [cancelArrowAnimation, scheduleNavStateUpdate, updateNavState]

    )



    const scrollByStep = useCallback(

      (direction: 'prev' | 'next') => {

        const track = trackRef.current

        if (!track) return



        const cardStep = getCardStep(track)

        const visibleCards = Math.max(1, Math.floor(track.clientWidth / cardStep))

        const step = cardStep * Math.min(visibleCards, 2)

        const delta = direction === 'next' ? step : -step



        animateScrollTo(track.scrollLeft + delta)

      },

      [animateScrollTo]

    )



    const scrollByStepRef = useRef(scrollByStep)

    const animateScrollToRef = useRef(animateScrollTo)



    useEffect(() => {

      scrollByStepRef.current = scrollByStep

      animateScrollToRef.current = animateScrollTo

    }, [scrollByStep, animateScrollTo])



    useEffect(() => {

      const track = trackRef.current

      const section = sectionRef.current

      if (!track) return



      const handleWheel = (event: WheelEvent) => {

        const maxScroll = track.scrollWidth - track.clientWidth

        if (maxScroll <= 4) return



        const delta = getWheelDelta(event)

        if (delta === 0) return



        event.preventDefault()

        event.stopPropagation()



        const scrollingRight = delta > 0

        const scrollingLeft = delta < 0

        const atStart = track.scrollLeft <= 1

        const atEnd = track.scrollLeft >= maxScroll - 1



        if ((scrollingRight && atEnd) || (scrollingLeft && atStart)) {

          wheelAccumRef.current = 0

          return

        }



        cancelArrowAnimation()

        wheelAccumRef.current += delta



        if (wheelAccumRef.current >= WHEEL_STEP_THRESHOLD) {

          wheelAccumRef.current = 0

          scrollByStepRef.current('next')

          return

        }



        if (wheelAccumRef.current <= -WHEEL_STEP_THRESHOLD) {

          wheelAccumRef.current = 0

          scrollByStepRef.current('prev')

        }

      }



      const wheelOptions: AddEventListenerOptions = { passive: false, capture: true }

      const attachWheelListeners = () => {
        if (!prefersFinePointer()) return
        track.addEventListener('wheel', handleWheel, wheelOptions)
        section?.addEventListener('wheel', handleWheel, wheelOptions)
      }

      const detachWheelListeners = () => {
        track.removeEventListener('wheel', handleWheel, wheelOptions)
        section?.removeEventListener('wheel', handleWheel, wheelOptions)
      }

      attachWheelListeners()

      updateNavState()

      track.addEventListener('scroll', scheduleNavStateUpdate, { passive: true })



      const observer = new ResizeObserver(updateNavState)

      observer.observe(track)



      return () => {

        detachWheelListeners()

        track.removeEventListener('scroll', scheduleNavStateUpdate)

        observer.disconnect()

        if (scrollRafRef.current !== null) {

          cancelAnimationFrame(scrollRafRef.current)

        }

        cancelArrowAnimation()

        wheelAccumRef.current = 0

      }

    }, [

      products.length,

      scheduleNavStateUpdate,

      updateNavState,

      cancelArrowAnimation,

    ])



    const isEmpty = products.length === 0
    const activeStyleLabel = activeBraceletStyle
      ? getBraceletStyleLabel(activeBraceletStyle)
      : ''
    const showUniversalStyleHint =
      category === '手串' &&
      activeBraceletStyle != null &&
      activeBraceletStyle !== '通用'

    const showNav = !isEmpty && (canScrollLeft || canScrollRight)



    return (

      <section

        ref={(node) => {

          sectionRef.current = node

          if (typeof ref === 'function') {

            ref(node)

          } else if (ref) {

            ref.current = node

          }

        }}

        id={`category-${category}`}

        className="scroll-mt-[calc(var(--site-header-height)+12rem)]"

        aria-label={`${getCategoryLabel(category)}商品`}

      >

        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="font-display text-2xl text-white md:text-3xl">
              {getCategoryLabel(category)}
            </h2>
            {category === '手串' && onBraceletStyleSelect && (
              <div className="max-w-full overflow-x-auto no-scrollbar">
                <BraceletStyleFilter
                  variant="inline"
                  activeStyle={activeBraceletStyle}
                  onSelect={onBraceletStyleSelect}
                />
              </div>
            )}
          </div>
          <p className="shrink-0 text-xs text-white/40">{products.length} 件</p>
        </div>



        <div className="relative">

          {showNav && (

            <>

              <div className={`${NAV_BUTTON_SLOT_CLASS} left-1 sm:left-0`}>

                <RowNavButton

                  direction="prev"

                  onClick={() => scrollByStep('prev')}

                  disabled={!canScrollLeft}

                />

              </div>

              <div className={`${NAV_BUTTON_SLOT_CLASS} right-1 sm:right-0`}>

                <RowNavButton

                  direction="next"

                  onClick={() => scrollByStep('next')}

                  disabled={!canScrollRight}

                />

              </div>

            </>

          )}



          {isEmpty ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-white/45">
              {category === '手串' && activeBraceletStyle ? (
                showUniversalStyleHint ? (
                  <>
                    目前無{activeStyleLabel}商品，可參考
                    <button
                      type="button"
                      onClick={() => onBraceletStyleSelect?.('通用')}
                      className="ml-1 text-amber-glow/90 underline decoration-amber-glow/40 underline-offset-2 transition hover:text-amber-glow"
                    >
                      通用款
                    </button>
                  </>
                ) : (
                  <>目前無{activeStyleLabel}商品</>
                )
              ) : (
                '目前沒有符合條件的商品'
              )}
            </p>
          ) : (
            <div
              ref={trackRef}
              className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 no-scrollbar snap-x snap-proximity"
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  data-carousel-card
                  className="w-44 shrink-0 snap-start sm:w-52 md:w-56 lg:w-60"
                >
                  <ProductCard
                    product={product}
                    onClick={() => onProductClick(product)}
                  />
                </div>
              ))}
            </div>
          )}

        </div>

      </section>

    )

  }

)

