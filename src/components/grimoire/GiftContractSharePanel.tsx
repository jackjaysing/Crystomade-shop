import { useState } from 'react'
import { Gift } from 'lucide-react'
import { isValidTaiwanMobile, normalizePhone } from '../../lib/phoneAuth'

interface GiftContractSharePanelProps {
  busy?: boolean
  onTransfer: (phone: string, confirmCode: string) => Promise<void>
}

function generateConfirmCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** 持有人：以對方手機轉送魔導書（防誤觸驗證碼） */
export function GiftContractSharePanel({
  busy = false,
  onTransfer,
}: GiftContractSharePanelProps) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [confirmInput, setConfirmInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!isValidTaiwanMobile(phone)) {
      setError('請填寫有效的台灣手機號碼')
      return
    }
    if (confirmInput.trim() !== confirmCode) {
      setError('驗證碼不符，請再確認一次以免轉錯')
      return
    }

    setSubmitting(true)
    try {
      await onTransfer(normalizePhone(phone), confirmCode)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '轉送失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <section className="magic-gift-panel">
        <div className="magic-gift-panel-header">
          <Gift className="magic-gift-panel-icon h-4 w-4" />
          <h4 className="magic-gift-panel-title">已轉送</h4>
        </div>
        <p className="magic-gift-panel-desc">
          魔導書已轉入對方帳戶。對方登入後可自行簽約。
        </p>
      </section>
    )
  }

  return (
    <section className="magic-gift-panel">
      <div className="magic-gift-panel-header">
        <Gift className="magic-gift-panel-icon h-4 w-4" />
        <h4 className="magic-gift-panel-title">轉送給朋友</h4>
      </div>
      <p className="magic-gift-panel-desc">
        填寫對方手機即可轉送。對方需已用此電話註冊會員；轉送後需由對方自行簽約。
      </p>

      {!open ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirmCode(generateConfirmCode())
            setConfirmInput('')
            setError('')
            setOpen(true)
          }}
          className="magic-gift-enable-btn"
        >
          轉送給朋友
        </button>
      ) : (
        <div className="magic-gift-link-box space-y-3">
          <label className="block text-sm text-white/70">
            對方手機
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912345678"
              value={phone}
              disabled={busy || submitting}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-void/60 px-3 py-2 text-white outline-none focus:border-amber-glow/50"
            />
          </label>

          <div className="rounded-lg border border-amber-glow/25 bg-amber-glow/5 px-3 py-3">
            <p className="text-xs tracking-wide text-amber-glow/80">防誤觸驗證碼</p>
            <p className="mt-1 font-mono text-2xl tracking-[0.35em] text-amber-glow">
              {confirmCode}
            </p>
            <p className="mt-1 text-xs text-white/45">請在下方再輸入一次相同數字後確認轉送</p>
          </div>

          <label className="block text-sm text-white/70">
            再次輸入驗證碼
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="六位數字"
              value={confirmInput}
              disabled={busy || submitting}
              onChange={(e) => setConfirmInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-void/60 px-3 py-2 font-mono tracking-[0.2em] text-white outline-none focus:border-amber-glow/50"
            />
          </label>

          {error && (
            <p className="text-sm text-rose-300/90" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || submitting}
              onClick={() => void handleSubmit()}
              className="magic-gift-enable-btn"
            >
              {submitting ? '轉送中…' : '確認轉送'}
            </button>
            <button
              type="button"
              disabled={busy || submitting}
              onClick={() => {
                setOpen(false)
                setError('')
                setConfirmInput('')
              }}
              className="magic-gift-copy-btn"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
