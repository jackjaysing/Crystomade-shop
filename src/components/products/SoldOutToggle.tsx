import { Eye, EyeOff } from 'lucide-react'

interface SoldOutToggleProps {
  showSoldOut: boolean
  onChange: (show: boolean) => void
}

/** 一鍵顯示／隱藏完售商品 */
export function SoldOutToggle({ showSoldOut, onChange }: SoldOutToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!showSoldOut)}
      aria-pressed={showSoldOut}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs tracking-wide transition sm:px-4 ${
        showSoldOut
          ? 'border-white/15 text-white/55 hover:border-white/30 hover:text-white/80'
          : 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
      }`}
      title={showSoldOut ? '隱藏已完售商品' : '顯示已完售商品'}
    >
      {showSoldOut ? (
        <EyeOff className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      ) : (
        <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      )}
      <span className="whitespace-nowrap">
        {showSoldOut ? '隱藏完售' : '顯示完售'}
      </span>
    </button>
  )
}
