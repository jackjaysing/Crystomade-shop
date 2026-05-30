import { useState, type FormEvent } from 'react'
import { loginAdmin } from '../../lib/adminAuth'
import { ADMIN_PASSWORD } from '../../lib/supabase'
import { GlassPanel } from '../ui/GlassPanel'

interface AdminLoginProps {
  onSuccess: () => void
}

/** 後台簡易密碼登入 */
export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!ADMIN_PASSWORD) {
      setError('請在 .env 設定 VITE_ADMIN_PASSWORD')
      return
    }
    if (loginAdmin(password, ADMIN_PASSWORD)) {
      onSuccess()
    } else {
      setError('密碼錯誤')
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <GlassPanel className="w-full max-w-md p-8">
        <h2 className="font-display text-2xl text-amber-glow">晶刻 · 管理後台</h2>
        <p className="mt-2 text-sm text-white/50">Crystomade Admin</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
            進入後台
          </button>
        </form>
      </GlassPanel>
    </div>
  )
}
