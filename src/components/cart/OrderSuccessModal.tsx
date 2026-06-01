import { useEffect, useState } from 'react'
import { LINE_OFFICIAL_URL } from '../../constants/line'

const COUNTDOWN_SECONDS = 10

function redirectToLine() {
  window.location.href = LINE_OFFICIAL_URL
}

/** 訂單成功後黑底金邊倒數跳轉彈窗（強制跳轉 LINE） */
export function OrderSuccessModal({ orderNumber }: { orderNumber?: string | null }) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) {
      redirectToLine()
      return
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border-2 border-amber-glow/60 bg-void p-8 shadow-[0_0_60px_rgba(212,165,116,0.25)]">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-metal-gradient opacity-30" />

        <div className="relative text-center">
          <p className="text-xs tracking-[0.4em] text-amber-glow/70">CRYSTOMADE</p>
          <h2
            id="order-success-title"
            className="mt-4 font-display text-3xl text-amber-glow sm:text-4xl"
          >
            訂單已成功送出！
          </h2>

          {orderNumber && (
            <p className="mt-4 font-display text-xl tracking-widest text-white/90">
              訂單編號{' '}
              <span className="text-amber-glow">{orderNumber}</span>
            </p>
          )}

          <p className="mt-6 text-base leading-relaxed text-white/85 sm:text-lg">
            系統即將自動跳轉至官方 LINE，加入後請務必主動傳送「您的姓名」與「電話後四碼」
            {orderNumber ? '，並附上訂單編號' : ''}
            ，老闆收到後會立即為您核對訂單並安排付款、出貨事宜！
          </p>

          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-glow/50 bg-amber-glow/10">
              <span className="font-display text-3xl text-amber-glow">{secondsLeft}</span>
            </div>
            <p className="text-sm text-white/50">
              {secondsLeft > 0 ? `${secondsLeft} 秒後自動跳轉…` : '正在跳轉…'}
            </p>
          </div>

          <button
            type="button"
            onClick={redirectToLine}
            className="mt-6 w-full rounded-lg border border-amber-glow/50 bg-amber-glow/10 py-3 text-sm tracking-widest text-amber-glow transition hover:bg-amber-glow/20"
          >
            立即跳轉
          </button>
        </div>
      </div>
    </div>
  )
}
