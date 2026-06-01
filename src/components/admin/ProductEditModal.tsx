import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { updateProduct, deleteProduct } from '../../lib/api/products'
import { PRODUCT_CATEGORIES } from '../../constants/categories'
import { ALL_PRODUCT_TAGS } from '../../constants/tags'
import type { Product, ProductCategory, ProductEditData } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface ProductEditModalProps {
  product: Product
  onClose: () => void
  onSaved: () => void
}

function toEditForm(product: Product): ProductEditData {
  return {
    name: product.name,
    category: product.category,
    price: product.price,
    tags: [...product.tags],
    description: product.description,
    stock: product.stock,
    coverFile: null,
    existingGalleryUrls: [...product.gallery_urls],
    galleryFiles: [],
  }
}

/** 後台：編輯已上架商品 */
export function ProductEditModal({
  product,
  onClose,
  onSaved,
}: ProductEditModalProps) {
  const [form, setForm] = useState<ProductEditData>(() => toEditForm(product))
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setForm(toEditForm(product))
    setCoverPreview(null)
    setNewGalleryPreviews([])
    setMessage('')
  }, [product])

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      newGalleryPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [coverPreview, newGalleryPreviews])

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, coverFile: file }))
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  const handleGalleryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    newGalleryPreviews.forEach((url) => URL.revokeObjectURL(url))
    setForm((prev) => ({ ...prev, galleryFiles: files }))
    setNewGalleryPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const removeExistingGallery = (index: number) => {
    setForm((prev) => ({
      ...prev,
      existingGalleryUrls: prev.existingGalleryUrls.filter((_, i) => i !== index),
    }))
  }

  const removeNewGallery = (index: number) => {
    setForm((prev) => ({
      ...prev,
      galleryFiles: prev.galleryFiles.filter((_, i) => i !== index),
    }))
    URL.revokeObjectURL(newGalleryPreviews[index])
    setNewGalleryPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || form.price <= 0) {
      setMessage('請填寫名稱與價格')
      return
    }
    if (form.tags.length === 0) {
      setMessage('請至少勾選一個標籤')
      return
    }
    if (form.stock < 0) {
      setMessage('庫存不可為負數')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      await updateProduct(product.id, form, product.image_url)
      onSaved()
      onClose()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `確定要刪除「${product.name}」？\n\n商品將移入「已刪除物品」，前台不再顯示。\n若尚有未出貨訂單則無法刪除；已出貨訂單紀錄會保留，之後可重新上架。`
      )
    ) {
      return
    }

    setDeleting(true)
    setMessage('')
    try {
      await deleteProduct(product.id)
      onSaved()
      onClose()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setDeleting(false)
    }
  }

  const busy = submitting || deleting

  const coverDisplay = coverPreview ?? product.image_url

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="關閉"
      />

      <GlassPanel className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white"
          aria-label="關閉視窗"
        >
          ✕
        </button>

        <h3 id="product-edit-title" className="font-display text-xl text-amber-glow">
          編輯商品
        </h3>
        <p className="mt-1 text-xs text-white/40">修改後前台會立即同步</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            placeholder="水晶名稱"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
          />
          <input
            type="number"
            min={0}
            placeholder="價格 (NT$)"
            value={form.price || ''}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
            className="input-field"
          />
          <input
            type="number"
            min={0}
            placeholder="庫存件數（0 = 售罄）"
            value={form.stock}
            onChange={(e) =>
              setForm({
                ...form,
                stock: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="input-field"
          />

          <div>
            <p className="mb-2 text-xs text-white/50">品類</p>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                    form.category === cat.id
                      ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                      : 'border-white/10 text-white/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit-category"
                    className="sr-only"
                    checked={form.category === cat.id}
                    onChange={() =>
                      setForm({ ...form, category: cat.id as ProductCategory })
                    }
                  />
                  {cat.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-white/50">功效標籤</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PRODUCT_TAGS.map((tag) => (
                <label
                  key={tag}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                    form.tags.includes(tag)
                      ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                      : 'border-white/10 text-white/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <textarea
            rows={4}
            placeholder="詳細描述"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field resize-none"
          />

          <div>
            <p className="mb-2 text-xs text-white/50">
              封面照片（不上傳則保留原圖）
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-amber-glow/30 py-8 transition hover:border-amber-glow/50">
              <img
                src={coverDisplay}
                alt="封面預覽"
                className="max-h-48 rounded object-cover"
              />
              <span className="mt-2 text-xs text-white/40">點擊更換封面</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs text-white/50">詳情相簿</p>
            {(form.existingGalleryUrls.length > 0 ||
              newGalleryPreviews.length > 0) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.existingGalleryUrls.map((url, index) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-20 rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingGallery(index)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-xs text-white"
                      aria-label="移除"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newGalleryPreviews.map((url, index) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-20 rounded object-cover ring-2 ring-amber-glow/50"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewGallery(index)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-xs text-white"
                      aria-label="移除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 py-6 transition hover:border-amber-glow/40">
              <span className="text-sm text-white/40">追加相簿照片</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleGalleryChange}
              />
            </label>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.includes('成功') ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {message}
            </p>
          )}

          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="w-full rounded-lg border border-red-400/40 py-3 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? '刪除中…' : '刪除此商品'}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/35">
              若已有訂單紀錄則無法刪除
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-lg border border-white/20 py-3 text-sm text-white/60 transition hover:text-white disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-amber-glow/90 py-3 text-sm tracking-widest text-void disabled:opacity-50"
            >
              {submitting ? '儲存中…' : '儲存更新'}
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  )
}
