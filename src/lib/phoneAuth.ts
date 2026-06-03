/** 正規化台灣手機為 8869xxxxxxxx */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('886')) {
    return digits
  }
  if (digits.startsWith('0')) {
    digits = '886' + digits.slice(1)
  } else if (digits.length === 9 && digits.startsWith('9')) {
    digits = '886' + digits
  }
  return digits
}

/** Supabase Email 登入用內部信箱（使用者只需記電話） */
export function phoneToAuthEmail(phone: string): string {
  return `m.${normalizePhone(phone)}@member.crystomade.local`
}

export function isValidTaiwanMobile(phone: string): boolean {
  const n = normalizePhone(phone)
  return /^8869\d{8}$/.test(n)
}

export function formatPhoneDisplay(phone: string): string {
  const n = normalizePhone(phone)
  if (/^8869\d{8}$/.test(n)) {
    return `0${n.slice(3)}`
  }
  return phone
}
