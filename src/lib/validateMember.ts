import { isValidTaiwanMobile, normalizePhone } from './phoneAuth'

export interface MemberRegisterInput {
  realName: string
  birthday: string
  phone: string
  password: string
  confirmPassword: string
  /** 好友推薦碼（選填） */
  referralCode?: string | null
}

export interface MemberLoginInput {
  phone: string
  password: string
}

export interface MemberChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function validateMemberRegister(
  input: MemberRegisterInput
): string | null {
  const name = input.realName.trim()
  if (!name) return '請填寫真實姓名'
  if (name.length < 2) return '請填寫完整姓名'

  if (!input.birthday) return '請選擇生日'

  const birth = new Date(input.birthday)
  if (Number.isNaN(birth.getTime())) return '生日格式不正確'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (birth > today) return '生日不可為未來日期'

  if (!isValidTaiwanMobile(input.phone)) {
    return '請填寫有效的台灣手機號碼（例：0912345678）'
  }

  if (!input.password || input.password.length < 6) {
    return '密碼至少 6 個字元'
  }
  if (input.password !== input.confirmPassword) {
    return '兩次密碼不一致'
  }

  return null
}

export function validateMemberLogin(input: MemberLoginInput): string | null {
  if (!isValidTaiwanMobile(input.phone)) {
    return '請填寫有效的手機號碼'
  }
  if (!input.password) return '請輸入密碼'
  return null
}

export function validateMemberPasswordChange(
  input: MemberChangePasswordInput
): string | null {
  if (!input.currentPassword) return '請輸入目前密碼'
  if (!input.newPassword || input.newPassword.length < 6) {
    return '新密碼至少 6 個字元'
  }
  if (input.newPassword === input.currentPassword) {
    return '新密碼不可與目前密碼相同'
  }
  if (input.newPassword !== input.confirmPassword) {
    return '兩次新密碼不一致'
  }
  return null
}

export function memberRegisterMetadata(input: MemberRegisterInput) {
  const referralCode = input.referralCode?.trim().toUpperCase()
  return {
    phone: normalizePhone(input.phone),
    real_name: input.realName.trim(),
    birthday: input.birthday,
    ...(referralCode ? { referral_code: referralCode } : {}),
  }
}
