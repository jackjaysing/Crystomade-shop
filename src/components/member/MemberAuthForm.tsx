import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  POINTS_PER_NTD_EARN,
  REFERRAL_WELCOME_BONUS_POINTS,
  WELCOME_BONUS_POINTS,
} from '../../constants/points'
import { useAuth } from '../../contexts/AuthContext'
import {
  clearPersistedReferralCode,
  getPersistedReferralCode,
  normalizeReferralCode,
  persistReferralCode,
  sanitizeReferralInput,
} from '../../lib/referral'
import { GlassPanel } from '../ui/GlassPanel'
import { PhoneNumberInput } from '../ui/PhoneNumberInput'

type AuthMode = 'login' | 'register'

interface MemberAuthFormProps {
  /** 精簡版（結帳頁）或完整版（會員中心） */
  variant?: 'checkout' | 'page'
  /** 進入頁面時預設分頁 */
  initialMode?: AuthMode
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
  initialMode = 'login',
  onSuccess,
}: MemberAuthFormProps) {
  const { login, register } = useAuth()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [referralCodeInput, setReferralCodeInput] = useState('')
  const [registerForm, setRegisterForm] = useState(emptyRegister)
  const [loginForm, setLoginForm] = useState(emptyLogin)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 輸入電話時先不掛密碼欄，避免 iOS 在數字鍵盤上方顯示會跳動的密碼工具列 */
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const loginPasswordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fromUrl = persistReferralCode(searchParams.get('ref'))
    const code = fromUrl ?? getPersistedReferralCode()
    if (code) {
      setReferralCodeInput(code)
      setMode('register')
    }
  }, [searchParams])

  const activeReferralCode = normalizeReferralCode(referralCodeInput)

  useEffect(() => {
    setShowPasswordFields(false)
  }, [mode])

  const revealPasswordFields = () => {
    setShowPasswordFields(true)
  }

  const handlePhoneKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      revealPasswordFields()
    }
  }

  useEffect(() => {
    if (showPasswordFields && mode === 'login') {
      loginPasswordRef.current?.focus()
    }
  }, [showPasswordFields, mode])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!showPasswordFields) {
      revealPasswordFields()
      setError(mode === 'login' ? '請輸入密碼' : '請設定密碼')
      return
    }
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
          referralCode: activeReferralCode,
        })
        clearPersistedReferralCode()
        setReferralCodeInput('')
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
        <div className="mt-3 space-y-2">
          {activeReferralCode && (
            <p className="rounded-lg border border-amber-glow/25 bg-amber-glow/10 px-3 py-2 text-xs leading-relaxed text-amber-glow/90">
              使用推薦碼 <span className="font-medium">{activeReferralCode}</span>{' '}
              註冊，完成註冊即贈 {REFERRAL_WELCOME_BONUS_POINTS} 點能量點數！
            </p>
          )}
          <p className="text-xs leading-relaxed text-white/40">
            只需填寫真實姓名、生日、手機與密碼。註冊贈{' '}
            {activeReferralCode ? REFERRAL_WELCOME_BONUS_POINTS : WELCOME_BONUS_POINTS}{' '}
            點；消費滿 NT${POINTS_PER_NTD_EARN} 累積 1 點，已付款或已出貨後入帳。
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="mt-4 space-y-3"
      >
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
            <PhoneNumberInput
              required
              enterKeyHint="next"
              name="register-phone"
              placeholder="手機號碼 *（例：0912345678）"
              value={registerForm.phone}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, phone: e.target.value })
              }
              onBlur={revealPasswordFields}
              className="input-field"
            />
            <div>
              <label className="mb-1 block text-xs text-white/45">
                好友推薦碼（選填）
              </label>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="例：JK8888"
                value={referralCodeInput}
                onChange={(e) =>
                  setReferralCodeInput(sanitizeReferralInput(e.target.value))
                }
                className="input-field uppercase tracking-widest"
                autoComplete="off"
                maxLength={12}
              />
              {referralCodeInput && !activeReferralCode && (
                <p className="mt-1 text-[11px] text-white/35">
                  推薦碼為 4–12 碼英數字
                </p>
              )}
            </div>
            {showPasswordFields && (
              <>
                <input
                  required
                  type="password"
                  placeholder="自設密碼 *（至少 6 碼）"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
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
            )}
          </>
        ) : (
          <>
            <PhoneNumberInput
              required
              enterKeyHint="next"
              name="login-phone"
              placeholder="手機號碼 *"
              value={loginForm.phone}
              onChange={(e) =>
                setLoginForm({ ...loginForm, phone: e.target.value })
              }
              onBlur={revealPasswordFields}
              onKeyDown={handlePhoneKeyDown}
              className="input-field"
            />
            {showPasswordFields && (
              <input
                ref={loginPasswordRef}
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
            )}
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
