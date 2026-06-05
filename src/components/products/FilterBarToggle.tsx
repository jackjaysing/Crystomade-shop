import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'

interface FilterBarToggleProps {
  expanded: boolean
  onChange: (expanded: boolean) => void
}

const COLLAPSED_TOGGLE_CLASS =
  'flex shrink-0 items-center gap-1.5 rounded-full border border-amber-glow/50 bg-amber-glow/10 px-3 py-2 text-xs tracking-wide text-amber-glow transition hover:border-amber-glow/70 hover:bg-amber-glow/15 sm:px-4'

const EXPANDED_TOGGLE_CLASS =
  'flex shrink-0 items-center gap-1.5 rounded-full border border-amber-glow/60 bg-amber-glow/15 px-3 py-2 text-xs font-medium tracking-wide text-amber-glow shadow-[0_0_16px_rgba(212,165,116,0.18)] transition hover:border-amber-glow/80 hover:bg-amber-glow/20 sm:px-4'

/** 展開／收起前台篩選列 */
export function FilterBarToggle({ expanded, onChange }: FilterBarToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!expanded)}
      aria-expanded={expanded}
      className={expanded ? EXPANDED_TOGGLE_CLASS : COLLAPSED_TOGGLE_CLASS}
      title={expanded ? '收起篩選欄位' : '展開篩選欄位'}
    >
      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      {expanded ? (
        <ChevronUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      )}
      <span className="whitespace-nowrap">{expanded ? '收起篩選' : '展開篩選'}</span>
    </button>
  )
}
