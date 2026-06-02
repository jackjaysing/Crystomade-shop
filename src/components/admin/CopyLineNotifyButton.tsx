import { type MouseEvent } from 'react'
import { MessageSquare } from 'lucide-react'
import { buildLineOrderNotificationMessage } from '../../lib/buildLineOrderNotification'
import { copyToClipboard } from '../../lib/copyToClipboard'
import type { OrderGroup } from '../../lib/groupOrders'

interface CopyLineNotifyButtonProps {
  group: OrderGroup
  disabled?: boolean
  onCopied: () => void
  onCopyFailed?: () => void
}

/** 複製 LINE 出貨通知罐頭訊息 */
export function CopyLineNotifyButton({
  group,
  disabled,
  onCopied,
  onCopyFailed,
}: CopyLineNotifyButtonProps) {
  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (disabled || group.status === 'cancelled') return

    const message = buildLineOrderNotificationMessage(group)
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
      title="複製出貨通知訊息"
      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:border-sky-400/55 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
      複製出貨通知
    </button>
  )
}
