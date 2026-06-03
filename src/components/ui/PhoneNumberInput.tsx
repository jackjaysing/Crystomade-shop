import type { InputHTMLAttributes } from 'react'

type PhoneNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'autoCorrect' | 'autoCapitalize' | 'spellCheck'
>

/**
 * 手機號碼輸入：使用 text + numeric 鍵盤，避開 iOS type=tel 觸發的
 * 聯絡人／密碼 AutoFill 工具列（鑰匙、錢包等圖示）在打字時跳動。
 */
export function PhoneNumberInput({
  autoComplete = 'off',
  ...props
}: PhoneNumberInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete={autoComplete}
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
    />
  )
}
