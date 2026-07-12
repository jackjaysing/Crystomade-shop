import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase } from '../supabase'

export interface BraceletShopSettings {
  beads_restocking: boolean
  updated_at: string | null
}

const DEFAULT: BraceletShopSettings = {
  beads_restocking: false,
  updated_at: null,
}

function throwSettingsHint(msg: string): never {
  if (/bracelet_shop_settings|42P01/i.test(msg)) {
    throw new Error(
      '資料庫尚未啟用配置設定表，請在 Supabase SQL Editor 執行 supabase/migration-bracelet-shop-settings.sql'
    )
  }
  throw new Error(msg)
}

function normalize(row: Record<string, unknown> | null | undefined): BraceletShopSettings {
  if (!row) return { ...DEFAULT }
  return {
    beads_restocking: Boolean(row.beads_restocking),
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  }
}

/** 前台／後台：讀取配置器全域設定 */
export async function fetchBraceletShopSettings(): Promise<BraceletShopSettings> {
  if (!isSupabaseConfigured) return { ...DEFAULT }

  const { data, error } = await supabase
    .from('bracelet_shop_settings')
    .select('beads_restocking, updated_at')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    if (/bracelet_shop_settings|42P01/i.test(formatErrorMessage(error))) {
      return { ...DEFAULT }
    }
    throw new Error(formatErrorMessage(error))
  }

  if (!data) {
    // 相容尚未插入預設列：嘗試建立
    const { data: inserted, error: insertErr } = await supabase
      .from('bracelet_shop_settings')
      .upsert({ id: 1, beads_restocking: false }, { onConflict: 'id' })
      .select('beads_restocking, updated_at')
      .single()
    if (insertErr) {
      if (/bracelet_shop_settings|42P01/i.test(formatErrorMessage(insertErr))) {
        return { ...DEFAULT }
      }
      throwSettingsHint(formatErrorMessage(insertErr))
    }
    return normalize(inserted as Record<string, unknown>)
  }

  return normalize(data as Record<string, unknown>)
}

/** 後台：更新是否顯示「補貨中」提示 */
export async function updateBeadsRestocking(enabled: boolean): Promise<BraceletShopSettings> {
  const { data, error } = await supabase
    .from('bracelet_shop_settings')
    .upsert(
      {
        id: 1,
        beads_restocking: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('beads_restocking, updated_at')
    .single()

  if (error) throwSettingsHint(formatErrorMessage(error))
  return normalize(data as Record<string, unknown>)
}
