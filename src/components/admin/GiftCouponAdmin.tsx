import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createGiftCoupon,
  deleteCoupon,
  fetchAdminCartGiftCoupons,
  issueCouponToAllMembers,
  issueCouponToMember,
  updateGiftCoupon,
  uploadGiftCouponImage,
} from '../../lib/api/coupons'
import { fetchRegisteredCustomers } from '../../lib/api/adminCustomers'
import type { AdminRegisteredCustomer, Coupon, GiftCouponFormData } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { IssueCouponMemberModal } from './IssueCouponMemberModal'

const emptyForm: GiftCouponFormData = {
  title: '',
  description: '',
  gift_description: '',
  image_url: null,
  is_active: true,
  valid_days: 30,
}

interface GiftCouponAdminProps {
  enabled?: boolean
}

/** 後台：禮物券範本（兌換入購物車）與發放 */
export function GiftCouponAdmin({ enabled = true }: GiftCouponAdminProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [members, setMembers] = useState<AdminRegisteredCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<GiftCouponFormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [issueCouponId, setIssueCouponId] = useState<string | null>(null)
  const [issueUserId, setIssueUserId] = useState('')
  const [issuing, setIssuing] = useState(false)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setMessage('')
    try {
      const [couponRows, memberRows] = await Promise.all([
        fetchAdminCartGiftCoupons(),
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
    setImageFile(null)
  }

  const loadEdit = (c: Coupon) => {
    if (c.source_raffle_id) return
    setEditingId(c.id)
    setForm({
      title: c.title,
      description: c.description,
      gift_description: c.gift_description ?? '',
      image_url: c.image_url,
      is_active: c.is_active,
      valid_days: c.valid_days,
    })
    setImageFile(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setMessage('請填寫禮物券名稱')
      return
    }
    if (!form.gift_description.trim()) {
      setMessage('請填寫贈品說明')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      let imageUrl = form.image_url
      if (imageFile) {
        imageUrl = await uploadGiftCouponImage(imageFile)
      }
      const payload: GiftCouponFormData = { ...form, image_url: imageUrl }

      if (editingId) {
        await updateGiftCoupon(editingId, payload)
        setMessage('已更新禮物券')
      } else {
        await createGiftCoupon(payload)
        setMessage('已新增禮物券')
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
    if (c.source_raffle_id) {
      setMessage('此禮物券由抽獎活動綁定，請至抽獎管理修改或刪除活動')
      return
    }
    if (!confirm(`確定刪除禮物券「${c.title}」？\n\n已發放給會員的紀錄可能受影響。`)) {
      return
    }
    try {
      await deleteCoupon(c.id)
      setMessage('已刪除禮物券')
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
      setMessage('已發放禮物券給指定會員')
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
        `確定將「${title}」一鍵發放給全部已註冊會員？\n\n每位會員都會新增一張可兌換入購物車的禮物券。`
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

  const issueCoupon = coupons.find((c) => c.id === issueCouponId)

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h2 className="font-display text-xl text-amber-glow">
          {editingId ? '編輯禮物券' : '新增禮物券'}
        </h2>
        <p className="mt-1 text-xs text-white/45">
          會員於會員中心「禮物券」兌換入購物車；結帳須搭配付費商品或點數兌換品。
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            required
            placeholder="禮物券名稱 *"
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
            <label className="mb-1 block text-xs text-white/50">贈品說明 *</label>
            <input
              required
              placeholder="例：限定水晶小物乙件"
              value={form.gift_description}
              onChange={(e) =>
                setForm({ ...form, gift_description: e.target.value })
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">禮物圖片</label>
            {form.image_url && !imageFile && (
              <img
                src={form.image_url}
                alt=""
                className="mb-2 h-24 w-24 rounded-lg border border-white/10 object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white/60 file:mr-3 file:rounded file:border-0 file:bg-amber-glow/20 file:px-3 file:py-1.5 file:text-xs file:text-amber-glow"
            />
          </div>
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
            啟用（可發放與兌換）
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-glow/90 px-6 py-2.5 text-sm font-medium text-void disabled:opacity-50"
            >
              {submitting ? '儲存中…' : editingId ? '儲存變更' : '新增禮物券'}
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
          <h2 className="font-display text-xl text-white">禮物券列表</h2>
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
          <p className="mt-4 text-sm text-white/40">尚無禮物券，請先新增或由抽獎活動建立</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {coupons.map((c) => {
              const raffleLinked = Boolean(c.source_raffle_id)
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {c.image_url && (
                        <img
                          src={c.image_url}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-white">{c.title}</p>
                        <p className="mt-1 text-xs text-amber-glow/90">
                          禮物券 · {c.gift_description ?? '—'}
                        </p>
                        {c.description && (
                          <p className="mt-1 text-xs text-white/45">{c.description}</p>
                        )}
                        <p className="mt-1 text-[11px] text-white/35">
                          {c.is_active ? '啟用中' : '已停用'}
                          {c.valid_days
                            ? ` · 發放後 ${c.valid_days} 天內有效`
                            : ' · 效期不限'}
                          {raffleLinked ? ' · 抽獎活動綁定' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!raffleLinked && (
                        <button
                          type="button"
                          onClick={() => loadEdit(c)}
                          className="rounded border border-white/15 px-3 py-1 text-xs text-white/70"
                        >
                          編輯
                        </button>
                      )}
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
                      {!raffleLinked && (
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
              )
            })}
          </ul>
        )}
      </GlassPanel>

      {issueCouponId && issueCoupon && (
        <IssueCouponMemberModal
          couponTitle={issueCoupon.title}
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
