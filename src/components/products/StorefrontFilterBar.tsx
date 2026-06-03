import { useState, type ReactNode } from 'react'
import {
  loadFilterBarExpanded,
  saveFilterBarExpanded,
} from '../../lib/filterBarVisibility'
import { FilterBarToggle } from './FilterBarToggle'

interface StorefrontFilterBarProps {
  children: ReactNode
}

/** 前台品類／篩選列：客戶自行展開或收起 */
export function StorefrontFilterBar({ children }: StorefrontFilterBarProps) {
  const [expanded, setExpanded] = useState(loadFilterBarExpanded)

  const handleExpandedChange = (next: boolean) => {
    setExpanded(next)
    saveFilterBarExpanded(next)
  }

  return (
    <section
      className="sticky top-[var(--site-header-height)] z-30 border-b border-white/5 bg-void/95 backdrop-blur-md"
      aria-label="商品篩選"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex justify-center py-2">
          <FilterBarToggle expanded={expanded} onChange={handleExpandedChange} />
        </div>
        {expanded && (
          <div className="border-t border-white/5 pb-2 pt-1">{children}</div>
        )}
      </div>
    </section>
  )
}
