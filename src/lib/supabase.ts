import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** 讀取並修剪環境變數（避免空白或僅換行造成異常） */
function readEnv(name: keyof ImportMetaEnv): string {
  const raw = import.meta.env[name]
  return typeof raw === 'string' ? raw.trim() : ''
}

export const supabaseUrl = readEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY')

/** 是否已正確設定 Supabase（前台會用此顯示提示，而非白屏） */
export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[晶刻] 請在 .env 設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY（可發布金鑰 sb_publishable_...）'
  )
}

/**
 * Supabase 客戶端
 * 注意：空字串不能用 ?? 預設，否則 createClient 會拋錯導致整頁白屏
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key-not-for-production'
)

/** 後台管理員密碼 */
export const ADMIN_PASSWORD = readEnv('VITE_ADMIN_PASSWORD')

/** Storage 桶名稱 */
export const PRODUCT_IMAGE_BUCKET = 'product-images'

/** Storage 圖片 CDN 快取（1 年，降低重複下載 egress） */
export const STORAGE_IMAGE_CACHE_CONTROL = '31536000'
