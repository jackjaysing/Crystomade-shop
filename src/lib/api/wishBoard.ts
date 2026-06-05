import { recordAdminActivity } from './adminActivityLog'
import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase } from '../supabase'
import type { WishMessage } from '../types'

const WISH_TABLE = 'wish_messages'
const MAX_CONTENT_LEN = 500
const MAX_NAME_LEN = 30

function normalizeWish(row: Record<string, unknown>): WishMessage {
  return {
    id: String(row.id),
    content: String(row.content),
    display_name: String(row.display_name ?? ''),
    member_id: String(row.member_id ?? ''),
    created_at: String(row.created_at),
    member_phone:
      row.member_phone != null && String(row.member_phone).trim() !== ''
        ? String(row.member_phone)
        : null,
  }
}

function missingTableMessage(): string {
  return '尚未建立許願留言資料表，請在 Supabase SQL Editor 執行 supabase/migration-add-wish-board.sql'
}

export interface SubmitWishInput {
  content: string
  displayName: string
  memberId: string
}

/** 會員：提交許願 */
export async function submitWishMessage(input: SubmitWishInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  if (!input.memberId) throw new Error('請先登入會員')

  const content = input.content.trim()
  if (!content) throw new Error('請填寫許願內容')
  if (content.length > MAX_CONTENT_LEN) {
    throw new Error(`許願內容最多 ${MAX_CONTENT_LEN} 字`)
  }

  const displayName = input.displayName.trim().slice(0, MAX_NAME_LEN)
  if (!displayName) throw new Error('會員資料不完整，請至會員中心確認姓名')

  const { error } = await supabase.from(WISH_TABLE).insert({
    content,
    display_name: displayName,
    member_id: input.memberId,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/wish_messages|42P01|42703/i.test(msg)) {
      throw new Error(missingTableMessage())
    }
    throw new Error(msg)
  }
}

/** 後台：取得全部許願 */
export async function fetchAllWishMessagesAdmin(): Promise<WishMessage[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase.rpc('fetch_all_wish_messages_admin')

  if (error) {
    const msg = formatErrorMessage(error)
    if (/wish_messages|fetch_all_wish_messages_admin|42P01|42883/i.test(msg)) {
      throw new Error(missingTableMessage())
    }
    throw new Error(msg)
  }

  return (data ?? []).map((row: Record<string, unknown>) => normalizeWish(row))
}

/** 後台：刪除許願 */
export async function deleteWishMessage(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { error } = await supabase.from(WISH_TABLE).delete().eq('id', id)
  if (error) throw new Error(formatErrorMessage(error))

  await recordAdminActivity({
    action: 'delete',
    entityType: 'wish_message',
    entityId: id,
    summary: '刪除許願留言',
  })
}
