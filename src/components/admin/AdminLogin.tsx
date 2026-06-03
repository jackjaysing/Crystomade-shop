import { useState, type FormEvent } from 'react'
import { loginAdmin } from '../../lib/adminAuth'
import { GlassPanel } from '../ui/GlassPanel'

interface AdminLoginProps {
  onSuccess: () => void
  /** embed：嵌在會員中心；page：獨立後台登入頁 */
  variant?: 'embed' | 'page'
}

/** 後台簡易密碼登入 */
export function AdminLogin({ onSuccess, variant = 'page' }: AdminLoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (loginAdmin(password)) {
      setPassword('')
      setError('')
      onSuccess()
    } else {
      setError('密碼錯誤')
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="管理員密碼"
        className="input-field"
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        className="w-full rounded-lg border border-amber-glow/50 py-3 text-sm tracking-widest text-amber-glow transition hover:bg-amber-glow/10"
      >
        管理登入
      </button>
    </form>
  )

  if (variant === 'embed') {
    return (
      <GlassPanel className="p-6 sm:p-8">
        <h2 className="font-display text-xl text-amber-glow">管理登入</h2>
        <p className="mt-1 text-sm text-white/45">
          管理者驗證後可進入後台管理商品與訂單
        </p>
        <div className="mt-6">{form}</div>
      </GlassPanel>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <GlassPanel className="w-full max-w-md p-8">
        <h2 className="font-display text-2xl text-amber-glow">晶刻 · 管理後台</h2>
        <p className="mt-2 text-sm text-white/50">Crystomade Admin</p>
        <div className="mt-8">{form}</div>
      </GlassPanel>
    </div>
  )
}
