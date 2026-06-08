import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createCoupon,
  deleteCoupon,
  fetchAdminCheckoutCoupons,
  issueCouponToAllMembers,
  issueCouponToMember,
  updateCoupon,
} from '../../lib/api/coupons'
import { fetchRegisteredCustomers } from '../../lib/api/adminCustomers'
import { formatCouponRuleSummary } from '../../lib/couponCalculation'
import {
  COUPON_TYPE_DESCRIPTIONS,
  COUPON_TYPE_LABELS,
} from '../../constants/coupons'
import { parseDiscountZhe } from '../../lib/productPricing'
import type { AdminRegisteredCustomer, Coupon, CouponFormData, CouponType } from '../../lib/types'
import { useAdminSession } from '../../hooks/useAdminSession'
import { GlassPanel } from '../ui/GlassPanel'
import { IssueCouponMemberModal } from './IssueCouponMemberModal'

const emptyForm: CouponFormData = {
  title: '',
  description: '',
  coupon_type: 'fixed_discount',
  min_purchase_amount: 600,
  discount_amount: 60,
  discount_zhe: null,
  gift_description: null,
  is_active: true,
  valid_days: 30,
}

interface CouponAdminProps {
  enabled?: boolean
}

/** 後台：優惠券範本與發放 */
export function CouponAdmin({ enabled = true }: CouponAdminProps) {
  const { isSuperAdmin } = useAdminSession()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [members, setMembers] = useState<AdminRegisteredCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<CouponFormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [issueCouponId, setIssueCouponId] = useState<string | null>(null)
  const [issueUserId, setIssueUserId] = useState('')
  const [issuing, setIssuing] = useState(false)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setMessage('')
    try {
      const [couponRows, memberRows] = await Promise.all([
        fetchAdminCheckoutCoupons(),
        fetchRegisteredCustomers(),
      ])
      setCoupons(couponRows)
      setMembers(memberRows)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const loadEdit = (c: Coupon) => {
    setEditingId(c.id)
    setForm({
      title: c.title,
      description: c.description,
      coupon_type: c.coupon_type,
      min_purchase_amount: c.min_purchase_amount,
      discount_amount: c.discount_amount,
      discount_zhe: c.discount_zhe,
      gift_description: c.gift_description,
      is_active: c.is_active,
      valid_days: c.valid_days,
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setMessage('請填寫優惠券名稱')
      return
    }
    if (form.coupon_type === 'fixed_discount' && (form.discount_amount ?? 0) <= 0) {
      setMessage('純折抵請填寫折抵金額')
      return
    }
    let discountZhe = form.discount_zhe
    if (form.coupon_type === 'percent_discount') {
      discountZhe = parseDiscountZhe(form.discount_zhe ?? '')
      if (discountZhe == null) {
        setMessage('純打折請填寫有效折扣（例：8 或 8.5）')
        return
      }
    }
    if (form.coupon_type === 'gift' && !form.gift_description?.trim()) {
      setMessage('禮物券請填寫贈品說明')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const payload: CouponFormData = {
        ...form,
        discount_zhe:
          form.coupon_type === 'percent_discount' ? discountZhe : null,
      }
      if (editingId) {
        await updateCoupon(editingId, payload)
        setMessage('已更新優惠券')
      } else {
        await createCoupon(payload)
        setMessage('已新增優惠券')
      }
      resetForm()
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`確定刪除優惠券「${c.title}」？\n\n已發放給會員的紀錄可能受影響。`)) {
      return
    }
    try {
      await deleteCoupon(c.id)
      setMessage('已刪除優惠券')
      if (editingId === c.id) resetForm()
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  const handleIssueOne = async () => {
    if (!issueCouponId || !issueUserId) {
      setMessage('請選擇會員')
      return
    }
    setIssuing(true)
    setMessage('')
    try {
      await issueCouponToMember(issueCouponId, issueUserId)
      setMessage('已發放優惠券給指定會員')
      setIssueCouponId(null)
      setIssueUserId('')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '發放失敗')
    } finally {
      setIssuing(false)
    }
  }

  const handleIssueAll = async (couponId: string, title: string) => {
    if (
      !confirm(
        `確定將「${title}」一鍵發放給全部已註冊會員？\n\n每位會員都會新增一張可用優惠券。`
      )
    ) {
      return
    }
    setIssuing(true)
    setMessage('')
    try {
      const count = await issueCouponToAllMembers(couponId)
      setMessage(`已發放給 ${count} 位會員`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '發放失敗')
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h2 className="font-display text-xl text-amber-glow">
          {editingId ? '編輯優惠券' : '新增優惠券'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            required
            placeholder="優惠券名稱 *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field"
          />
          <textarea
            placeholder="說明（選填）"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field min-h-[72px] resize-y"
          />

          <div>
            <p className="mb-2 text-xs text-white/50">優惠類型 *</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(COUPON_TYPE_LABELS) as CouponType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      coupon_type: type,
                      discount_amount: type === 'fixed_discount' ? 60 : null,
                      discount_zhe: type === 'percent_discount' ? 8 : null,
                      gift_description:
                        type === 'gift' ? form.gift_description ?? '' : null,
                    })
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    form.coupon_type === type
                      ? 'border-amber-glow/50 bg-amber-glow/15 text-amber-glow'
                      : 'border-white/15 text-white/55'
                  }`}
                >
                  {COUPON_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-white/35">
              {COUPON_TYPE_DESCRIPTIONS[form.coupon_type]}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">
              滿額門檻（付費商品小計，NT$）*
            </label>
            <input
              type="number"
              min={0}
              value={form.min_purchase_amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  min_purchase_amount: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="input-field"
            />
          </div>

          {form.coupon_type === 'fixed_discount' && (
            <div>
              <label className="mb-1 block text-xs text-white/50">折抵金額（NT$）*</label>
              <input
                type="number"
                min={1}
                value={form.discount_amount ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discount_amount: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="input-field"
              />
            </div>
          )}

          {form.coupon_type === 'percent_discount' && (
            <div>
              <label className="mb-1 block text-xs text-white/50">折扣（折）*</label>
              <input
                type="number"
                min={0.1}
                max={9.9}
                step={0.1}
                value={form.discount_zhe ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discount_zhe: parseDiscountZhe(e.target.value),
                  })
                }
                className="input-field"
              />
            </div>
          )}

          {form.coupon_type === 'gift' && (
            <div>
              <label className="mb-1 block text-xs text-white/50">贈品說明 *</label>
              <input
                placeholder="例：水晶消磁盒乙個"
                value={form.gift_description ?? ''}
                onChange={(e) =>
                  setForm({ ...form, gift_description: e.target.value })
                }
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-white/50">
              有效天數（發放後；留空＝不限）
            </label>
            <input
              type="number"
              min={1}
              placeholder="留空表示不限"
              value={form.valid_days ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                setForm({
                  ...form,
                  valid_days:
                    raw === '' ? null : Math.max(1, Math.floor(Number(raw) || 0)),
                })
              }}
              className="input-field"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-white/20"
            />
            啟用（可發放與使用）
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-glow/90 px-6 py-2.5 text-sm font-medium text-void disabled:opacity-50"
            >
              {submitting ? '儲存中…' : editingId ? '儲存變更' : '新增優惠券'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/60"
              >
                取消編輯
              </button>
            )}
          </div>
        </form>
      </GlassPanel>

      {message && (
        <p
          className={`text-sm ${
            message.includes('已') ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {message}
        </p>
      )}

      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-white">優惠券列表</h2>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="text-sm text-white/50 hover:text-amber-glow"
          >
            重新整理
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-white/40">載入中…</p>
        ) : coupons.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">尚無優惠券，請先新增</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {coupons.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{c.title}</p>
                    <p className="mt-1 text-xs text-amber-glow/90">
                      {COUPON_TYPE_LABELS[c.coupon_type]} ·{' '}
                      {formatCouponRuleSummary(c)}
                    </p>
                    {c.description && (
                      <p className="mt-1 text-xs text-white/45">{c.description}</p>
                    )}
                    <p className="mt-1 text-[11px] text-white/35">
                      {c.is_active ? '啟用中' : '已停用'}
                      {c.valid_days
                        ? ` · 發放後 ${c.valid_days} 天內有效`
                        : ' · 效期不限'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadEdit(c)}
                      className="rounded border border-white/15 px-3 py-1 text-xs text-white/70"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      disabled={!c.is_active || issuing}
                      onClick={() => {
                        setIssueCouponId(c.id)
                        setIssueUserId('')
                      }}
                      className="rounded border border-amber-glow/35 px-3 py-1 text-xs text-amber-glow disabled:opacity-40"
                    >
                      單獨發放
                    </button>
                    <button
                      type="button"
                      disabled={!c.is_active || issuing}
                      onClick={() => void handleIssueAll(c.id, c.title)}
                      className="rounded border border-sky-400/35 px-3 py-1 text-xs text-sky-300 disabled:opacity-40"
                    >
                      一鍵全發
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(c)}
                        className="rounded border border-red-400/35 px-3 py-1 text-xs text-red-300"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      {issueCouponId && (
        <IssueCouponMemberModal
          couponTitle={coupons.find((c) => c.id === issueCouponId)?.title ?? ''}
          members={members}
          issueUserId={issueUserId}
          issuing={issuing}
          onIssueUserIdChange={setIssueUserId}
          onCancel={() => {
            setIssueCouponId(null)
            setIssueUserId('')
          }}
          onConfirm={() => void handleIssueOne()}
        />
      )}
    </div>
  )
}
