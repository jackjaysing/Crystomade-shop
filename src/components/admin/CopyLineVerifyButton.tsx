import { type MouseEvent } from 'react'
import { FileText } from 'lucide-react'
import { buildLineOrderVerificationMessage } from '../../lib/buildLineOrderVerification'
import { copyToClipboard } from '../../lib/copyToClipboard'
import type { OrderGroup } from '../../lib/groupOrders'

interface CopyLineVerifyButtonProps {
  group: OrderGroup
  disabled?: boolean
  onCopied: () => void
  onCopyFailed?: () => void
}

/** 複製 LINE 核對訂單（未結帳）罐頭訊息 */
export function CopyLineVerifyButton({
  group,
  disabled,
  onCopied,
  onCopyFailed,
}: CopyLineVerifyButtonProps) {
  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (disabled || group.status === 'cancelled') return

    const message = buildLineOrderVerificationMessage(group)
    const ok = await copyToClipboard(message)
    if (ok) {
      onCopied()
    } else {
      onCopyFailed?.()
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || group.status === 'cancelled'}
      onClick={(e) => void handleClick(e)}
      title="複製核對訂單（未結帳）訊息"
      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:border-violet-400/55 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
      複製核對訂單
    </button>
  )
}
