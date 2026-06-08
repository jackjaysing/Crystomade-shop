import { useState, type FormEvent } from 'react'
import { changeMemberPassword } from '../../lib/api/members'
import { GlassPanel } from '../ui/GlassPanel'
import { PasswordInput } from '../ui/PasswordInput'

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

/** 會員中心：重設登入密碼（預設收合，點擊後展開表單） */
export function MemberChangePasswordPanel() {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleOpen = () => {
    setExpanded(true)
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    setExpanded(false)
    setForm(emptyForm)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await changeMemberPassword(form)
      setForm(emptyForm)
      setSuccess('密碼已更新，下次登入請使用新密碼')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重設密碼失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassPanel className="mt-6 p-6 sm:p-8">
      <p className="text-xs tracking-[0.35em] text-amber-glow/70">SECURITY</p>
      <h2 className="mt-2 font-display text-xl text-white sm:text-2xl">重設密碼</h2>

      {!expanded ? (
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          需要更新登入密碼？
          <button
            type="button"
            onClick={handleOpen}
            className="ml-1 text-amber-glow/90 underline decoration-amber-glow/40 underline-offset-2 transition hover:text-amber-glow"
          >
            點此重設密碼
          </button>
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            請輸入目前密碼與新密碼，完成後下次登入請使用新密碼。
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3">
            <div>
              <label
                className="mb-1 block text-xs text-white/45"
                htmlFor="current-password"
              >
                目前密碼
              </label>
              <PasswordInput
                id="current-password"
                required
                placeholder="目前密碼"
                value={form.currentPassword}
                onChange={(e) =>
                  setForm({ ...form, currentPassword: e.target.value })
                }
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/45" htmlFor="new-password">
                新密碼
              </label>
              <PasswordInput
                id="new-password"
                required
                placeholder="新密碼（至少 6 碼）"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs text-white/45"
                htmlFor="confirm-new-password"
              >
                確認新密碼
              </label>
              <PasswordInput
                id="confirm-new-password"
                required
                placeholder="再次輸入新密碼"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 rounded-lg border border-white/10 py-3 text-sm tracking-wide text-white/50 transition hover:border-white/20 hover:text-white/70 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg border border-amber-glow/40 bg-amber-glow/15 py-3 text-sm font-medium tracking-widest text-amber-glow transition hover:bg-amber-glow/25 disabled:opacity-50"
              >
                {submitting ? '更新中…' : '更新密碼'}
              </button>
            </div>
          </form>
        </>
      )}
    </GlassPanel>
  )
}
