import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'

interface FilterBarToggleProps {
  expanded: boolean
  onChange: (expanded: boolean) => void
}

/** 展開／收起前台篩選列 */
export function FilterBarToggle({ expanded, onChange }: FilterBarToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!expanded)}
      aria-expanded={expanded}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs tracking-wide transition sm:px-4 ${
        expanded
          ? 'border-white/15 text-white/55 hover:border-white/30 hover:text-white/80'
          : 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
      }`}
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
