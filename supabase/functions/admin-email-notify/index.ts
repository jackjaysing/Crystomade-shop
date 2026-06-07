import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const DEFAULT_NOTIFY_EMAIL = 'Crystomade@gmail.com'
const DEFAULT_FROM = 'Crystomade Shop <onboarding@resend.dev>'
const RESEND_API_URL = 'https://api.resend.com/emails'

type OrderRecord = {
  id: string
  checkout_id?: string | null
  order_number?: string | null
  buyer_name?: string | null
  total_amount?: number | null
  created_at?: string | null
}

type MemberRecord = {
  id: string
  real_name?: string | null
  phone?: string | null
  created_at?: string | null
}

type WebhookBody = {
  type?: string
  table?: string
  record?: OrderRecord | MemberRecord
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sendEmail(options: {
  apiKey: string
  from: string
  to: string
  subject: string
  text: string
}) {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Email 發送失敗 (${res.status}): ${detail}`)
  }
}

async function reserveDedupeKey(
  supabase: ReturnType<typeof createClient>,
  dedupeKey: string
): Promise<boolean> {
  const { error } = await supabase.from('line_notify_sent').insert({ dedupe_key: dedupeKey })
  if (!error) return true
  if (error.code === '23505') return false
  throw new Error(error.message)
}

async function buildOrderEmail(
  supabase: ReturnType<typeof createClient>,
  record: OrderRecord
): Promise<{ subject: string; text: string }> {
  let total = Number(record.total_amount) || 0
  let orderNumber = record.order_number?.trim() || ''

  if (record.checkout_id?.trim()) {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, order_number')
      .eq('checkout_id', record.checkout_id)
      .is('deleted_at', null)

    if (!error && Array.isArray(data) && data.length > 0) {
      total = data.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0)
      if (!orderNumber) {
        orderNumber = String(data.find((row) => row.order_number)?.order_number ?? '').trim()
      }
    }
  }

  const label = orderNumber || '新訂單'
  const buyer = record.buyer_name?.trim() || '（未填姓名）'

  return {
    subject: `【晶刻】新訂單 ${label}`,
    text: [
      '晶刻 Crystomade 後台通知',
      '',
      '有新的訂單，請至後台「訂單管理」查看。',
      '',
      `訂單編號：${label}`,
      `買家姓名：${buyer}`,
      `訂單金額：NT$ ${total.toLocaleString('zh-TW')}`,
      `時間：${record.created_at ?? '—'}`,
    ].join('\n'),
  }
}

function buildMemberEmail(record: MemberRecord): { subject: string; text: string } {
  const name = record.real_name?.trim() || '（未填姓名）'
  const phone = record.phone?.trim() || '—'

  return {
    subject: '【晶刻】新會員註冊',
    text: [
      '晶刻 Crystomade 後台通知',
      '',
      '有新會員註冊，請至後台「客戶資料」查看。',
      '',
      `姓名：${name}`,
      `電話：${phone}`,
      `時間：${record.created_at ?? '—'}`,
    ].join('\n'),
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!resendKey) {
    return jsonResponse({ error: 'RESEND_API_KEY 未設定' }, 500)
  }

  const notifyEmail = Deno.env.get('ADMIN_NOTIFY_EMAIL')?.trim() || DEFAULT_NOTIFY_EMAIL
  const fromEmail = Deno.env.get('EMAIL_FROM')?.trim() || DEFAULT_FROM

  const webhookSecret = Deno.env.get('ADMIN_EMAIL_WEBHOOK_SECRET')?.trim()
  if (webhookSecret) {
    const provided = req.headers.get('x-admin-email-secret')?.trim()
    if (provided !== webhookSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase service 環境變數未設定' }, 500)
  }

  let payload: WebhookBody
  try {
    payload = (await req.json()) as WebhookBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const table = payload.table?.trim()
  const record = payload.record
  if (!table || !record || payload.type !== 'INSERT') {
    return jsonResponse({ skipped: true, reason: '非 INSERT 事件' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    if (table === 'orders') {
      const order = record as OrderRecord
      const dedupeKey = `order:${order.checkout_id?.trim() || order.id}`
      const reserved = await reserveDedupeKey(supabase, dedupeKey)
      if (!reserved) {
        return jsonResponse({ skipped: true, reason: 'duplicate checkout' })
      }
      const mail = await buildOrderEmail(supabase, order)
      await sendEmail({
        apiKey: resendKey,
        from: fromEmail,
        to: notifyEmail,
        subject: mail.subject,
        text: mail.text,
      })
      return jsonResponse({ ok: true, type: 'order', to: notifyEmail })
    }

    if (table === 'member_profiles') {
      const member = record as MemberRecord
      const dedupeKey = `member:${member.id}`
      const reserved = await reserveDedupeKey(supabase, dedupeKey)
      if (!reserved) {
        return jsonResponse({ skipped: true, reason: 'duplicate member' })
      }
      const mail = buildMemberEmail(member)
      await sendEmail({
        apiKey: resendKey,
        from: fromEmail,
        to: notifyEmail,
        subject: mail.subject,
        text: mail.text,
      })
      return jsonResponse({ ok: true, type: 'member', to: notifyEmail })
    }

    return jsonResponse({ skipped: true, reason: 'unsupported table' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤'
    console.error('[admin-email-notify]', table, message)
    return jsonResponse({ error: message }, 500)
  }
})
