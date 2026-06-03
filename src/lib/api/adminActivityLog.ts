import { getAdminDisplayName } from '../adminAuth'
import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase } from '../supabase'

export type AdminActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'sort'
  | 'status'

export type AdminActivityEntityType = 'product' | 'order' | 'banner' | 'member'

export interface AdminActivityLog {
  id: string
  created_at: string
  admin_name: string
  action: AdminActivityAction
  entity_type: AdminActivityEntityType
  entity_id: string | null
  entity_label: string | null
  summary: string
}

export interface RecordAdminActivityInput {
  action: AdminActivityAction
  entityType: AdminActivityEntityType
  entityId?: string
  entityLabel?: string
  summary: string
}

function normalizeLog(row: Record<string, unknown>): AdminActivityLog {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    admin_name: String(row.admin_name),
    action: String(row.action) as AdminActivityAction,
    entity_type: String(row.entity_type) as AdminActivityEntityType,
    entity_id: row.entity_id != null ? String(row.entity_id) : null,
    entity_label: row.entity_label != null ? String(row.entity_label) : null,
    summary: String(row.summary),
  }
}

/** 寫入一筆後台操作紀錄（失敗不阻擋主要流程） */
export async function recordAdminActivity(
  input: RecordAdminActivityInput
): Promise<void> {
  const adminName = getAdminDisplayName()
  if (!adminName || !isSupabaseConfigured) return

  const { error } = await supabase.from('admin_activity_logs').insert({
    admin_name: adminName,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    summary: input.summary,
  })

  if (error) {
    console.warn('[晶刻] 後台日誌寫入失敗:', formatErrorMessage(error))
  }
}

/** 後台：取得操作日誌（最新優先） */
export async function fetchAdminActivityLogs(
  limit = 200
): Promise<AdminActivityLog[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    const msg = formatErrorMessage(error)
    if (/admin_activity_logs|42P01|42703/i.test(msg)) {
      throw new Error(
        '尚未建立後台日誌資料表，請在 Supabase SQL Editor 執行 supabase/migration-add-admin-activity-logs.sql'
      )
    }
    throw new Error(msg)
  }

  return (data ?? []).map((row) =>
    normalizeLog(row as Record<string, unknown>)
  )
}
