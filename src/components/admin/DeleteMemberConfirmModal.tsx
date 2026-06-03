import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { generateVerificationCode } from '../../lib/generateVerificationCode'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import type { AdminRegisteredCustomer } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface DeleteMemberConfirmModalProps {
  customer: AdminRegisteredCustomer
  deleting: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

/** 刪除會員註冊資料前輸入隨機 4 碼驗證 */
export function DeleteMemberConfirmModal({
  customer,
  deleting,
  onClose,
  onConfirm,
}: DeleteMemberConfirmModalProps) {
  const expectedCode = useMemo(() => generateVerificationCode(4), [])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const typed = input.trim().toUpperCase()
    if (typed !== expectedCode) {
      setError('驗證碼不正確，請重新輸入')
      return
    }
    setError('')
    void onConfirm()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-member-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={deleting ? undefined : onClose}
        aria-label="關閉"
      />

      <GlassPanel className="relative z-10 w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <h2
              id="delete-member-title"
              className="font-display text-lg text-red-200"
            >
              刪除會員註冊資料
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white disabled:opacity-40"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/65">
          確定要刪除會員{' '}
          <span className="text-amber-glow">
            {customer.real_name} · {formatPhoneDisplay(customer.phone)}
          </span>
          的註冊資料？
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-white/45">
          <li>會員帳號、點數與點數紀錄將永久刪除</li>
          <li>歷史訂單會保留，但不再綁定此會員</li>
          <li>同電話號碼可再次註冊新帳號</li>
        </ul>

        <p className="mt-4 text-sm text-white/50">
          請輸入以下驗證碼以確認刪除：
        </p>
        <p className="mt-2 rounded-lg border border-amber-glow/30 bg-amber-glow/10 py-3 text-center font-display text-2xl tracking-[0.35em] text-amber-glow">
          {expectedCode}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value.toUpperCase())
              setError('')
            }}
            disabled={deleting}
            placeholder="輸入驗證碼"
            maxLength={4}
            autoComplete="off"
            className="input-field text-center font-display text-lg tracking-[0.3em] uppercase"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-white/60 transition hover:text-white/80 disabled:opacity-40"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={deleting || input.trim().length !== 4}
              className="flex-1 rounded-lg border border-red-400/50 bg-red-500/15 py-2.5 text-sm text-red-200 transition hover:bg-red-500/25 disabled:opacity-40"
            >
              {deleting ? '刪除中…' : '確認刪除'}
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  )
}
