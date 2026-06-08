import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase } from '../supabase'
import type { FortuneConsultationRequest } from '../types'

const TABLE = 'fortune_consultation_requests'
const MAX_QUESTION_LEN = 500
const MAX_LINE_ID_LEN = 50
const MAX_NAME_LEN = 30
const MAX_ADMIN_NOTES_LEN = 500

function normalizeRow(row: Record<string, unknown>): FortuneConsultationRequest {
  return {
    id: String(row.id),
    question: String(row.question),
    line_id: String(row.line_id),
    display_name:
      row.display_name != null && String(row.display_name).trim() !== ''
        ? String(row.display_name)
        : null,
    member_id:
      row.member_id != null && String(row.member_id).trim() !== ''
        ? String(row.member_id)
        : null,
    created_at: String(row.created_at),
    member_phone:
      row.member_phone != null && String(row.member_phone).trim() !== ''
        ? String(row.member_phone)
        : null,
    member_real_name:
      row.member_real_name != null && String(row.member_real_name).trim() !== ''
        ? String(row.member_real_name)
        : null,
    estimated_fee:
      row.estimated_fee == null
        ? null
        : typeof row.estimated_fee === 'number'
          ? row.estimated_fee
          : Number(row.estimated_fee) || null,
    contacted_at:
      row.contacted_at != null && String(row.contacted_at).trim() !== ''
        ? String(row.contacted_at)
        : null,
    paid_at:
      row.paid_at != null && String(row.paid_at).trim() !== ''
        ? String(row.paid_at)
        : null,
    admin_notes:
      row.admin_notes != null && String(row.admin_notes).trim() !== ''
        ? String(row.admin_notes)
        : null,
  }
}

function missingTableMessage(): string {
  return '尚未建立命理諮詢資料表，請在 Supabase SQL Editor 執行 supabase/migration-add-fortune-consultation.sql'
}

export interface SubmitFortuneConsultationInput {
  question: string
  lineId: string
  displayName?: string | null
  memberId?: string | null
}

/** 提交命理諮詢（僅登入會員） */
export async function submitFortuneConsultation(
  input: SubmitFortuneConsultationInput
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  if (!input.memberId) throw new Error('請先登入會員')

  const question = input.question.trim()
  if (!question) throw new Error('請填寫諮詢問題')
  if (question.length > MAX_QUESTION_LEN) {
    throw new Error(`諮詢問題最多 ${MAX_QUESTION_LEN} 字`)
  }

  const lineId = input.lineId.trim()
  if (!lineId) throw new Error('請填寫 Line ID')
  if (lineId.length > MAX_LINE_ID_LEN) {
    throw new Error(`Line ID 最多 ${MAX_LINE_ID_LEN} 字`)
  }

  const displayName = input.displayName?.trim().slice(0, MAX_NAME_LEN) || null

  const { error } = await supabase.from(TABLE).insert({
    question,
    line_id: lineId,
    display_name: displayName,
    member_id: input.memberId ?? null,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/fortune_consultation|42P01|42703/i.test(msg)) {
      throw new Error(missingTableMessage())
    }
    throw new Error(msg)
  }
}

/** 後台：取得全部命理諮詢 */
export async function fetchAllFortuneConsultationsAdmin(): Promise<
  FortuneConsultationRequest[]
> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase.rpc('fetch_all_fortune_consultations_admin')

  if (error) {
    const msg = formatErrorMessage(error)
    if (
      /fortune_consultation|fetch_all_fortune_consultations_admin|42P01|42883/i.test(
        msg
      )
    ) {
      throw new Error(missingTableMessage())
    }
    throw new Error(msg)
  }

  return (data ?? []).map((row: Record<string, unknown>) => normalizeRow(row))
}

const FORTUNE_DELETE_RPC_MISSING =
  '命理諮詢刪除權限未設定完成，請在 Supabase SQL Editor 執行 supabase/migration-fix-fortune-consultation-delete.sql'

const FORTUNE_UPDATE_RPC_MISSING =
  '命理諮詢更新權限未設定完成，請在 Supabase SQL Editor 執行 supabase/migration-add-fortune-consultation-admin-notes.sql'

export interface UpdateFortuneConsultationAdminInput {
  estimatedFee?: number | null
  contacted?: boolean
  paid?: boolean
  adminNotes?: string | null
}

function formatFortuneFeeSummary(fee: number | null | undefined): string {
  if (fee == null) return '（未填寫）'
  return `NT$ ${fee.toLocaleString()}`
}

/** 後台：更新命理諮詢（預估費用、已聯繫、已付款） */
export async function updateFortuneConsultationAdmin(
  id: string,
  patch: UpdateFortuneConsultationAdminInput
): Promise<FortuneConsultationRequest> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const updateEstimatedFee = patch.estimatedFee !== undefined
  const estimatedFee =
    patch.estimatedFee == null
      ? null
      : Math.max(0, Math.floor(patch.estimatedFee))
  const updateAdminNotes = patch.adminNotes !== undefined
  const adminNotes =
    patch.adminNotes == null ? null : patch.adminNotes.trim().slice(0, MAX_ADMIN_NOTES_LEN)

  const { data: updated, error: rpcError } = await supabase.rpc(
    'update_fortune_consultation_admin',
    {
      p_id: id,
      p_estimated_fee: estimatedFee,
      p_update_estimated_fee: updateEstimatedFee,
      p_contacted: patch.contacted ?? null,
      p_paid: patch.paid ?? null,
      p_admin_notes: adminNotes,
      p_update_admin_notes: updateAdminNotes,
    }
  )

  if (rpcError) {
    const msg = formatErrorMessage(rpcError)
    if (/update_fortune_consultation_admin|42883|42P01|42703/i.test(msg)) {
      throw new Error(FORTUNE_UPDATE_RPC_MISSING)
    }
    throw new Error(msg)
  }

  if (!updated) throw new Error('更新失敗，找不到該則諮詢')

  const rows = await fetchAllFortuneConsultationsAdmin()
  const row = rows.find((item) => item.id === id)
  if (!row) throw new Error('更新後無法讀取諮詢資料')

  const summaries: string[] = []
  if (updateEstimatedFee) {
    summaries.push(`預估費用 ${formatFortuneFeeSummary(estimatedFee)}`)
  }
  if (patch.contacted === true) summaries.push('標記已聯繫')
  if (patch.contacted === false) summaries.push('取消已聯繫')
  if (patch.paid === true) summaries.push('標記已付款')
  if (patch.paid === false) summaries.push('取消已付款')
  if (updateAdminNotes) summaries.push('更新命理師備註')

  if (summaries.length > 0) {
    const contact = row.member_real_name || row.display_name || '會員'
    await recordAdminActivity({
      action: 'update',
      entityType: 'fortune_consultation',
      entityId: id,
      entityLabel: contact,
      summary: `更新命理諮詢「${contact}」：${summaries.join('；')}`,
    })
  }

  return row
}

/** 後台：刪除命理諮詢 */
export async function deleteFortuneConsultation(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data: deleted, error: rpcError } = await supabase.rpc(
    'delete_fortune_consultation_admin',
    { p_id: id }
  )

  if (!rpcError) {
    if (!deleted) throw new Error('刪除失敗，找不到該則諮詢')
    await recordAdminActivity({
      action: 'delete',
      entityType: 'fortune_consultation',
      entityId: id,
      summary: '刪除命理諮詢留言',
    })
    return
  }

  const rpcMsg = formatErrorMessage(rpcError)
  if (!/delete_fortune_consultation_admin|42883|42P01/i.test(rpcMsg)) {
    throw new Error(rpcMsg)
  }

  const { data: rows, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw new Error(formatErrorMessage(error))
  if (!rows?.length) throw new Error(FORTUNE_DELETE_RPC_MISSING)

  await recordAdminActivity({
    action: 'delete',
    entityType: 'fortune_consultation',
    entityId: id,
    summary: '刪除命理諮詢留言',
  })
}
