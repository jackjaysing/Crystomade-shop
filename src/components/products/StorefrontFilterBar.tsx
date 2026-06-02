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
    <section className="sticky top-[73px] z-30 border-y border-white/5 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        {expanded && <div className="pt-2">{children}</div>}
        <div
          className={`flex justify-center py-2 ${
            expanded ? 'border-t border-white/5' : ''
          }`}
        >
          <FilterBarToggle expanded={expanded} onChange={handleExpandedChange} />
        </div>
      </div>
    </section>
  )
}
