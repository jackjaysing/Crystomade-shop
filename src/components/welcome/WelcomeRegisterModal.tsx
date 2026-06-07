import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel'

interface WelcomeRegisterModalProps {
  open: boolean
  onClose: () => void
}

/** 首頁訪客註冊歡迎蓋台彈窗 */
export function WelcomeRegisterModal({ open, onClose }: WelcomeRegisterModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[58] flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-register-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/85 backdrop-blur-sm"
        onClick={onClose}
        aria-label="關閉歡迎視窗"
      />

      <div className="relative z-10 w-full max-w-md">
        <GlassPanel className="relative overflow-hidden border-amber-glow/35 bg-void/90 p-0 shadow-[0_0_48px_rgba(212,175,55,0.12)]">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-glow/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-glow/10 blur-3xl"
            aria-hidden
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-void/80 text-white/70 transition hover:border-amber-glow/50 hover:bg-void hover:text-amber-glow"
            aria-label="關閉"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <div className="relative px-6 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-12">
            <p className="text-center text-[10px] tracking-[0.45em] text-amber-glow/70">
              WELCOME
            </p>
            <h2
              id="welcome-register-title"
              className="mt-3 text-center font-display text-xl leading-snug text-white sm:text-2xl"
            >
              晶刻 Crystomade・迎新結緣大禮✨
            </h2>

            <div className="my-6 h-px bg-gradient-to-r from-transparent via-amber-glow/40 to-transparent" />

            <ul className="space-y-3 text-sm leading-relaxed text-white/65 sm:text-[15px]">
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-glow/80" aria-hidden />
                <span>
                  完成會員註冊，即獲贈
                  <span className="font-medium text-amber-glow">「100 點迎新禮金」</span>。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-glow/80" aria-hidden />
                <span>
                  <span className="font-medium text-amber-glow/90">【尊榮加碼】</span>
                  若有朋友的專屬推薦連結／推薦碼，註冊當下填寫，迎新禮金立刻
                  <span className="font-medium text-amber-glow">【雙倍放大】成 200 點！</span>
                </span>
              </li>
              <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white/55">
                點數可折抵或至點數商城兌換各種好禮。
              </li>
            </ul>

            <Link
              to="/register"
              state={{ register: true }}
              onClick={onClose}
              className="mt-8 flex w-full items-center justify-center rounded-lg border border-amber-glow/50 bg-gradient-to-r from-amber-glow/20 via-amber-glow/10 to-amber-glow/20 py-3.5 text-sm font-medium tracking-widest text-amber-glow transition hover:border-amber-glow hover:from-amber-glow/30 hover:to-amber-glow/30"
            >
              立即註冊，開啟能量大門
            </Link>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
