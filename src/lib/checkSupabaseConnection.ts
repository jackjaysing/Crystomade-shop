import { isSupabaseConfigured, supabaseUrl } from './supabase'

export interface ConnectionDiagnosis {
  ok: boolean
  summary: string
  details: string[]
}

/**
 * 在瀏覽器直接測 Supabase 是否 reachable（比「fetch failed」更具體）
 */
export async function diagnoseSupabaseConnection(): Promise<ConnectionDiagnosis> {
  const details: string[] = []

  if (!isSupabaseConfigured) {
    return {
      ok: false,
      summary: '.env 未設定完整',
      details: ['請確認 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY 已填入並重啟 npm run dev'],
    }
  }

  details.push(`URL：${supabaseUrl}`)

  try {
    const healthRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    details.push(`健康檢查：HTTP ${healthRes.status} ${healthRes.statusText}`)

    if (healthRes.status === 503) {
      return {
        ok: false,
        summary: '此 URL 的 API 回傳 503（專案暫停或網址填錯）',
        details: [
          ...details,
          '若 Dashboard 顯示 Healthy：請在「Healthy 專案」的 Settings → API 複製 Project URL，覆蓋 .env（不要沿用舊專案網址）',
          '比對：Dashboard 網址列 project/XXXX 中的 XXXX 應等於 .env 網址的 XXXX.supabase.co',
          '更新後：SYNC-ENV.bat → npm.cmd run dev → F5',
        ],
      }
    }

    if (!healthRes.ok) {
      return {
        ok: false,
        summary: `Supabase 回應異常（${healthRes.status}）`,
        details,
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    details.push(`健康檢查失敗：${msg}`)
    return {
      ok: false,
      summary: '無法連到 Supabase 網域',
      details: [
        ...details,
        '若 Dashboard 能開、網頁卻失敗：可能是防毒/公司網路攔截 HTTPS',
        '可試：關 VPN、換手機熱點、暫停防毒「HTTPS 掃描」',
        '確認電腦日期時間正確',
      ],
    }
  }

  try {
    const { error } = await (
      await import('./supabase')
    ).supabase.from('products').select('id', { count: 'exact', head: true })

    if (error) {
      details.push(`資料庫：${error.message}`)
      return {
        ok: false,
        summary: '能連上 Supabase，但讀取 products 失敗',
        details: [
          ...details,
          '請確認 SQL Editor 已執行 schema.sql',
          'Table Editor 是否有 products 表',
        ],
      }
    }

    details.push('資料庫：products 表可讀取')
  } catch (e) {
    details.push(`資料庫測試失敗：${e instanceof Error ? e.message : String(e)}`)
  }

  return {
    ok: true,
    summary: 'Supabase 連線正常',
    details,
  }
}
