interface AccountSectionHeaderProps {
  eyebrow: string
  title: string
  lead?: string
}

/** 會員中心區塊標題：固定 eyebrow → 標題 → 說明 */
export function AccountSectionHeader({
  eyebrow,
  title,
  lead,
}: AccountSectionHeaderProps) {
  return (
    <header>
      <p className="shop-eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-display text-xl text-white">{title}</h2>
      {lead ? <p className="mt-2 text-sm leading-relaxed text-white/55">{lead}</p> : null}
    </header>
  )
}
