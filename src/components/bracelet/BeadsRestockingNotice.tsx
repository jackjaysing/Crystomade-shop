import { Link } from 'react-router-dom'

interface BeadsRestockingNoticeProps {
  className?: string
}

/** 前台：珠材補貨中提示 */
export function BeadsRestockingNotice({ className = '' }: BeadsRestockingNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-amber-glow/30 bg-amber-glow/10 px-4 py-3 text-sm leading-relaxed text-amber-100/90 ${className}`}
      role="status"
    >
      部分珠子補貨中。如有其他珠子需求，可至
      <Link
        to="/wish-board"
        className="mx-1 font-medium text-amber-glow underline underline-offset-2 hover:text-amber-200"
      >
        許願區
      </Link>
      許願，或等待官方上架。
    </div>
  )
}
