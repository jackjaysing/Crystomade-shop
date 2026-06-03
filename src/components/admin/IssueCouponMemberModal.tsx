import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import type { AdminRegisteredCustomer } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface IssueCouponMemberModalProps {
  couponTitle: string
  members: AdminRegisteredCustomer[]
  issueUserId: string
  issuing: boolean
  onIssueUserIdChange: (userId: string) => void
  onCancel: () => void
  onConfirm: () => void
}

/** 後台：發放優惠／禮物券給指定會員 */
export function IssueCouponMemberModal({
  couponTitle,
  members,
  issueUserId,
  issuing,
  onIssueUserIdChange,
  onCancel,
  onConfirm,
}: IssueCouponMemberModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4">
      <GlassPanel className="w-full max-w-md p-6">
        <h3 className="font-display text-lg text-white">發放給指定會員</h3>
        <p className="mt-1 text-sm text-white/50">{couponTitle}</p>
        <label className="mt-4 block text-xs text-white/50">選擇會員</label>
        <select
          value={issueUserId}
          onChange={(e) => onIssueUserIdChange(e.target.value)}
          className="admin-select mt-1"
        >
          <option value="">選擇會員…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.real_name} · {formatPhoneDisplay(m.phone)}
            </option>
          ))}
        </select>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-white/60"
          >
            取消
          </button>
          <button
            type="button"
            disabled={issuing}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-amber-glow/90 py-2.5 text-sm font-medium text-void disabled:opacity-50"
          >
            {issuing ? '發放中…' : '確認發放'}
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
