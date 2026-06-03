import { useEffect, useState } from 'react'
import { isIntegerInputDraft, parseIntegerInput } from '../../lib/parseIntegerInput'

interface IntegerFieldProps {
  value: number
  onChange: (value: number) => void
  /** 編輯中的字串（含空字串），供送出前解析 */
  onDraftChange?: (text: string) => void
  min?: number
  placeholder?: string
  className?: string
  id?: string
  required?: boolean
}

/**
 * 整數欄位：可全選刪除後重打，不會被 type=number 卡在 0。
 */
export function IntegerField({
  value,
  onChange,
  onDraftChange,
  min = 0,
  placeholder,
  className = 'input-field',
  id,
  required,
}: IntegerFieldProps) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    const next = String(value)
    setText(next)
    onDraftChange?.(next)
  }, [value])

  const commit = (raw: string) => {
    const next = parseIntegerInput(raw, min)
    const nextText = String(next)
    setText(nextText)
    onDraftChange?.(nextText)
    onChange(next)
  }

  return (
    <input
      id={id}
      required={required}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const raw = e.target.value
        if (!isIntegerInputDraft(raw)) return
        setText(raw)
        onDraftChange?.(raw)
        if (raw !== '') {
          onChange(parseIntegerInput(raw, min))
        }
      }}
      onBlur={() => commit(text)}
      className={className}
    />
  )
}
