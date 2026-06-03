import { useState, type FormEvent } from 'react'
import { POINTS_PER_NTD_EARN, WELCOME_BONUS_POINTS } from '../../constants/points'
import { useAuth } from '../../contexts/AuthContext'
import { GlassPanel } from '../ui/GlassPanel'

type AuthMode = 'login' | 'register'

interface MemberAuthFormProps {
  /** 精簡版（結帳頁）或完整版（會員中心） */
  variant?: 'checkout' | 'page'
  onSuccess?: () => void
}

const emptyRegister = {
  realName: '',
  birthday: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

const emptyLogin = {
  phone: '',
  password: '',
}

/** 會員登入／註冊（僅：姓名、生日、電話、密碼） */
export function MemberAuthForm({
  variant = 'page',
  onSuccess,
}: MemberAuthFormProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [registerForm, setRegisterForm] = useState(emptyRegister)
  const [loginForm, setLoginForm] = useState(emptyLogin)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'register') {
        await register({
          realName: registerForm.realName,
          birthday: registerForm.birthday,
          phone: registerForm.phone,
          password: registerForm.password,
          confirmPassword: registerForm.confirmPassword,
        })
      } else {
        await login({
          phone: loginForm.phone,
          password: loginForm.password,
        })
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const compact = variant === 'checkout'

  return (
    <GlassPanel className={compact ? 'p-5 sm:p-6' : 'p-8'}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setError(null)
          }}
          className={`flex-1 rounded-lg border py-2.5 text-sm tracking-wide transition ${
            mode === 'login'
              ? 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
              : 'border-white/10 text-white/50 hover:text-white/80'
          }`}
        >
          會員登入
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register')
            setError(null)
          }}
          className={`flex-1 rounded-lg border py-2.5 text-sm tracking-wide transition ${
            mode === 'register'
              ? 'border-amber-glow/50 bg-amber-glow/10 text-amber-glow'
              : 'border-white/10 text-white/50 hover:text-white/80'
          }`}
        >
          註冊會員
        </button>
      </div>

      {mode === 'register' && (
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          只需填寫真實姓名、生日、手機與密碼。註冊贈 {WELCOME_BONUS_POINTS} 點；消費滿 NT${POINTS_PER_NTD_EARN} 累積 1 點，已付款或已出貨後入帳。
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {mode === 'register' ? (
          <>
            <input
              required
              placeholder="真實姓名 *"
              value={registerForm.realName}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, realName: e.target.value })
              }
              className="input-field"
              autoComplete="name"
            />
            <div>
              <label className="mb-1 block text-xs text-white/45">生日 *</label>
              <input
                required
                type="date"
                value={registerForm.birthday}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, birthday: e.target.value })
                }
                className="input-field"
              />
            </div>
            <input
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              enterKeyHint="next"
              name="register-phone"
              placeholder="手機號碼 *（例：0912345678）"
              value={registerForm.phone}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, phone: e.target.value })
              }
              className="input-field"
            />
            <input
              required
              type="password"
              placeholder="自設密碼 *（至少 6 碼）"
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, password: e.target.value })
              }
              className="input-field"
              autoComplete="new-password"
            />
            <input
              required
              type="password"
              placeholder="確認密碼 *"
              value={registerForm.confirmPassword}
              onChange={(e) =>
                setRegisterForm({
                  ...registerForm,
                  confirmPassword: e.target.value,
                })
              }
              className="input-field"
              autoComplete="new-password"
            />
          </>
        ) : (
          <>
            <input
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              enterKeyHint="next"
              name="login-phone"
              placeholder="手機號碼 *"
              value={loginForm.phone}
              onChange={(e) =>
                setLoginForm({ ...loginForm, phone: e.target.value })
              }
              className="input-field"
            />
            <input
              required
              type="password"
              placeholder="密碼 *"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              className="input-field"
              autoComplete="current-password"
            />
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg border border-amber-glow/40 bg-amber-glow/15 py-3 text-sm font-medium tracking-widest text-amber-glow transition hover:bg-amber-glow/25 disabled:opacity-50"
        >
          {submitting
            ? '處理中…'
            : mode === 'register'
              ? '建立會員'
              : '登入'}
        </button>
      </form>
    </GlassPanel>
  )
}
