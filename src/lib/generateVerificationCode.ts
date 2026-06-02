const VERIFICATION_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** 產生 4 碼英數驗證碼（排除易混淆字元 0/O/1/I） */
export function generateVerificationCode(length = 4): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * VERIFICATION_CHARS.length)
    code += VERIFICATION_CHARS[index]
  }
  return code
}
