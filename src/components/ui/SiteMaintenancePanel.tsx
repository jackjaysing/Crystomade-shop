import { INSTAGRAM_URL, LINE_OFFICIAL_URL } from '../../constants/social'

/** 前台資料載入失敗時的維修提示（不顯示技術錯誤） */
export function SiteMaintenancePanel() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-glow/25 bg-amber-glow/5 px-6 py-10 text-center">
      <p className="font-display text-2xl tracking-wide text-amber-glow">網站維修升級中</p>
      <p className="mt-2 text-sm text-white/70">敬請期待</p>
      <p className="mt-5 text-sm leading-relaxed text-white/50">
        如有相關需求歡迎聯繫{' '}
        <a
          href={LINE_OFFICIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-glow/90 underline decoration-amber-glow/40 underline-offset-2 transition hover:text-amber-glow"
        >
          官方 LINE
        </a>
        {' '}或{' '}
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-glow/90 underline decoration-amber-glow/40 underline-offset-2 transition hover:text-amber-glow"
        >
          Instagram
        </a>
      </p>
    </div>
  )
}
