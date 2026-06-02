import { Users } from 'lucide-react'
import { SOCIAL_LINKS } from '../../constants/social'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

function SocialIcon({ id }: { id: string }) {
  if (id === 'instagram') {
    return <InstagramIcon className="h-5 w-5" />
  }
  if (id === 'line-official') {
    return <LineIcon className="h-5 w-5" />
  }
  return <Users className="h-5 w-5" strokeWidth={1.5} />
}

/** 全站頁尾：官方 IG / LINE / LINE 社群 */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black/40 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-6">
        <p className="text-[10px] tracking-[0.35em] text-white/30">CRYSTOMADE</p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-amber-glow/50 hover:bg-amber-glow/10 hover:text-amber-glow"
            >
              <SocialIcon id={link.id} />
            </a>
          ))}
        </div>

        <p className="text-[10px] text-white/25">晶刻 · 天然水晶典藏</p>

        <section
          className="mt-6 w-full max-w-3xl border-t border-white/[0.06] pt-8"
          aria-labelledby="footer-disclaimer-title"
        >
          <h2
            id="footer-disclaimer-title"
            className="text-center text-xs font-medium tracking-wider text-amber-glow/80"
          >
            【能量水晶免責聲明】
          </h2>
          <p className="mt-4 text-left text-[11px] leading-relaxed text-white/40 sm:text-center sm:text-xs">
            晶刻 Crystomade 網站內所載之水晶、礦石之「五行」、「生命靈數」及「能量場描述」，皆屬於傳統自然療癒、心靈輔助與個人信念領域，並非醫療行為，亦不能取代任何正式的醫學診斷與心理治療。
          </p>
          <p className="mt-3 text-left text-[11px] leading-relaxed text-white/40 sm:text-center sm:text-xs">
            如有任何身體、生理或心理疾病之不適，請務必尋求專業合格之醫療機構與醫師協助。
          </p>
        </section>

        <p className="mt-8 text-center text-xs tracking-wide text-white/35">
          晶刻Crystomade © Copyright 2026
        </p>
      </div>
    </footer>
  )
}
