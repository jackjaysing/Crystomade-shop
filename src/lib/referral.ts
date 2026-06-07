import { absoluteUrl } from './siteMeta'

const REFERRAL_STORAGE_KEY = 'crystal_referral_code'

/** 輸入時過濾為英數大寫（最多 12 碼） */
export function sanitizeReferralInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

/** 正規化推薦碼（大寫、去空白） */
export function normalizeReferralCode(
  code: string | null | undefined
): string | null {
  const trimmed = code?.trim().toUpperCase() ?? ''
  if (!trimmed || !/^[A-Z0-9]{4,12}$/.test(trimmed)) return null
  return trimmed
}

/** 從 URL 讀取 ?ref= 並寫入 sessionStorage */
export function persistReferralCode(
  code: string | null | undefined
): string | null {
  const normalized = normalizeReferralCode(code)
  if (normalized) {
    try {
      sessionStorage.setItem(REFERRAL_STORAGE_KEY, normalized)
    } catch {
      /* ignore quota / private mode */
    }
    return normalized
  }
  return getPersistedReferralCode()
}

export function getPersistedReferralCode(): string | null {
  try {
    return normalizeReferralCode(sessionStorage.getItem(REFERRAL_STORAGE_KEY))
  } catch {
    return null
  }
}

export function clearPersistedReferralCode(): void {
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 推薦註冊連結（/register?ref=CODE） */
export function buildReferralRegisterUrl(code: string): string {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return absoluteUrl('/register')
  return absoluteUrl(`/register?ref=${encodeURIComponent(normalized)}`)
}
