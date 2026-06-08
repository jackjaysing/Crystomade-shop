import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase } from '../supabase'
import type { FortuneConsultationRequest } from '../types'

const TABLE = 'fortune_consultation_requests'
const MAX_QUESTION_LEN = 500
const MAX_LINE_ID_LEN = 50
const MAX_NAME_LEN = 30

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

/** 後台：刪除命理諮詢 */
export async function deleteFortuneConsultation(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(formatErrorMessage(error))

  await recordAdminActivity({
    action: 'delete',
    entityType: 'fortune_consultation',
    entityId: id,
    summary: '刪除命理諮詢留言',
  })
}
