/** 前台：串製時可能增減水晶／補隔珠提醒 */
export function BeadsFitAdjustNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-white/15 bg-black/25 px-4 py-3 text-sm leading-relaxed text-white/70 ${className}`}
      role="note"
    >
      <p className="font-medium text-amber-glow/90">串製提醒</p>
      <p className="mt-1.5">
        客人自行配置的珠數與咪數不一定完全符合手圍。出貨串製時，晶刻會依手圍
        <span className="text-white/85">適當增減水晶或補隔珠</span>
        ，讓手串更合手；必要時也可能微調珠序。
      </p>
    </div>
  )
}
