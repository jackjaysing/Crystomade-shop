import { Store } from 'lucide-react'

interface StudioAvailableToggleProps {
  active: boolean
  onChange: (active: boolean) => void
}

/** 一鍵切換：僅顯示工作室同步商品 */
export function StudioAvailableToggle({ active, onChange }: StudioAvailableToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs tracking-wide transition sm:px-4 ${
        active
          ? 'border-emerald-300/60 bg-emerald-400/10 text-emerald-200'
          : 'border-white/15 text-white/55 hover:border-white/30 hover:text-white/80'
      }`}
      title={active ? '顯示全部商品' : '僅顯示工作室同步商品'}
    >
      <Store className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      <span className="whitespace-nowrap">工作室同步</span>
    </button>
  )
}
