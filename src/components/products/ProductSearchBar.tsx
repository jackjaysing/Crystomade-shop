import { Search, X } from 'lucide-react'

interface ProductSearchBarProps {
  value: string
  onChange: (value: string) => void
}

/** 商品關鍵字搜尋列 */
export function ProductSearchBar({ value, onChange }: ProductSearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜尋關鍵字…"
        aria-label="搜尋商品關鍵字"
        className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-9 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-amber-glow/50 focus:ring-1 focus:ring-amber-glow/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 transition hover:text-white"
          aria-label="清除搜尋"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
