import { getAdminDisplayName } from '../adminAuth'
import { formatErrorMessage } from '../formatError'
import { supabase } from '../supabase'
import type { AdminOwlMessageBatch, MemberOwlMessage } from '../types'
import { recordAdminActivity } from './adminActivityLog'

function migrationHint(msg: string): Error | null {
  if (
    /member_messages|admin_send_member_message|member_list_owl|owl_message|42P01/i.test(
      msg
    )
  ) {
    return new Error(
      '資料庫尚未啟用貓頭鷹信件，請在 Supabase SQL Editor 執行 supabase/migration-member-owl-messages.sql'
    )
  }
  return null
}

function normalizeMessage(row: Record<string, unknown>): MemberOwlMessage {
  return {
    id: String(row.id),
    batch_id: String(row.batch_id),
    recipient_user_id: String(row.recipient_user_id),
    subject: String(row.subject ?? ''),
    body: String(row.body ?? ''),
    sent_by_admin_name: String(row.sent_by_admin_name ?? ''),
    is_broadcast: Boolean(row.is_broadcast),
    read_at: row.read_at != null ? String(row.read_at) : null,
    created_at: String(row.created_at),
  }
}

function normalizeBatch(row: Record<string, unknown>): AdminOwlMessageBatch {
  return {
    batch_id: String(row.batch_id),
    subject: String(row.subject ?? ''),
    body: String(row.body ?? ''),
    sent_by_admin_name: String(row.sent_by_admin_name ?? ''),
    is_broadcast: Boolean(row.is_broadcast),
    recipient_count: Number(row.recipient_count) || 0,
    read_count: Number(row.read_count) || 0,
    member_deleted_count: Number(row.member_deleted_count) || 0,
    created_at: String(row.created_at),
    sample_recipient_name:
      row.sample_recipient_name != null
        ? String(row.sample_recipient_name)
        : null,
  }
}

/** 後台：寄給指定會員 */
export async function adminSendOwlMessageToMember(input: {
  userId: string
  subject: string
  body: string
  recipientLabel?: string
}): Promise<string> {
  const adminName = getAdminDisplayName() || '後台'
  const { data, error } = await supabase.rpc('admin_send_member_message', {
    p_user_id: input.userId,
    p_subject: input.subject.trim(),
    p_body: input.body.trim(),
    p_admin_name: adminName,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    throw migrationHint(msg) ?? new Error(msg)
  }

  void recordAdminActivity({
    action: 'create',
    entityType: 'member_message',
    entityId: data != null ? String(data) : undefined,
    entityLabel: input.recipientLabel ?? input.userId,
    summary: `貓頭鷹信件 → ${input.recipientLabel ?? '會員'}：${input.subject.trim() || '（無主旨）'}`,
  })

  return data != null ? String(data) : ''
}

/** 後台：寄給全體註冊會員 */
export async function adminSendOwlMessageToAll(input: {
  subject: string
  body: string
}): Promise<number> {
  const adminName = getAdminDisplayName() || '後台'
  const { data, error } = await supabase.rpc('admin_send_member_message_to_all', {
    p_subject: input.subject.trim(),
    p_body: input.body.trim(),
    p_admin_name: adminName,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    throw migrationHint(msg) ?? new Error(msg)
  }

  const count = Number(data) || 0
  void recordAdminActivity({
    action: 'create',
    entityType: 'member_message',
    entityLabel: '全體會員',
    summary: `貓頭鷹信件 → 全體 ${count} 位：${input.subject.trim() || '（無主旨）'}`,
  })

  return count
}

/** 後台：寄送紀錄 */
export async function adminListOwlMessageBatches(
  limit = 50
): Promise<AdminOwlMessageBatch[]> {
  const { data, error } = await supabase.rpc('admin_list_member_message_batches', {
    p_limit: limit,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    throw migrationHint(msg) ?? new Error(msg)
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    normalizeBatch(row)
  )
}

/** 會員：信件列表 */
export async function fetchMemberOwlMessages(
  limit = 20
): Promise<MemberOwlMessage[]> {
  const { data, error } = await supabase.rpc('member_list_owl_messages', {
    p_limit: limit,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    throw migrationHint(msg) ?? new Error(msg)
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    normalizeMessage(row)
  )
}

/** 會員：未讀數量 */
export async function fetchUnreadOwlMessageCount(): Promise<number> {
  const { data, error } = await supabase.rpc('member_unread_owl_message_count')

  if (error) {
    const msg = formatErrorMessage(error)
    if (migrationHint(msg)) return 0
    throw new Error(msg)
  }

  return Number(data) || 0
}

/** 會員：標記已讀 */
export async function markOwlMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('member_mark_owl_message_read', {
    p_message_id: messageId,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    throw migrationHint(msg) ?? new Error(msg)
  }
}

/** 會員：刪除信件（不可復原） */
export async function deleteOwlMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('member_delete_owl_message', {
    p_message_id: messageId,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/member_delete_owl_message/i.test(msg)) {
      throw new Error(
        '資料庫尚未啟用會員刪除信件，請在 Supabase SQL Editor 執行 supabase/migration-member-owl-message-delete.sql'
      )
    }
    throw migrationHint(msg) ?? new Error(msg)
  }
}
