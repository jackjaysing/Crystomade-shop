import { isSupabaseConfigured } from '../../lib/supabase'

/** 環境變數未設定時的明確提示（避免白屏） */
export function EnvSetupBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div className="border-b border-amber-glow/30 bg-amber-glow/10 px-6 py-4 text-center text-sm text-amber-glow">
      <p className="font-medium">尚未設定 Supabase 金鑰</p>
      <p className="mt-1 text-white/60">
        請編輯 <code className="text-white/80">EDIT-ME-SUPABASE-KEYS.txt</code>，在{' '}
        <code className="text-white/80">VITE_SUPABASE_ANON_KEY=</code> 後貼上可發布金鑰，存檔後執行{' '}
        <code className="text-white/80">sync-to-dotenv.bat</code>，並重啟{' '}
        <code className="text-white/80">npm run dev</code>
      </p>
    </div>
  )
}
