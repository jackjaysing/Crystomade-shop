import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes } from 'react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** 密碼輸入：右側眼睛圖示可切換顯示／隱藏 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className = '', ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`input-field pr-11 ${className}`.trim()}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
          aria-label={visible ? '隱藏密碼' : '顯示密碼'}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>
    )
  }
)
