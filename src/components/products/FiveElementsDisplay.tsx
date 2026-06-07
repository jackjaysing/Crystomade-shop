import { FIVE_ELEMENTS } from '../../constants/fiveElements'
import type { FiveElement } from '../../constants/fiveElements'

interface FiveElementsDisplayProps {
  elements: FiveElement[]
}

/** 商品詳情：五行顯示（有選中者點亮，其餘灰階） */
export function FiveElementsDisplay({ elements }: FiveElementsDisplayProps) {
  const active = new Set(elements)

  return (
    <div>
      <p className="mb-2 text-xs tracking-[0.2em] text-white/50">五行</p>
      <div className="flex flex-wrap gap-2" role="list" aria-label="五行屬性">
        {FIVE_ELEMENTS.map((el) => {
          const isActive = active.has(el)
          return (
            <span
              key={el}
              role="listitem"
              aria-current={isActive ? 'true' : undefined}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-medium transition ${
                isActive
                  ? 'border-amber-glow/50 bg-amber-glow/15 text-amber-glow shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                  : 'border-white/10 bg-white/5 text-white/25'
              }`}
            >
              {el}
            </span>
          )
        })}
      </div>
    </div>
  )
}
