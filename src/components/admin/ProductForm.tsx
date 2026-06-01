import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { createProduct } from '../../lib/api/products'
import { PRODUCT_CATEGORIES } from '../../constants/categories'
import { CRYSTAL_COLOR_FILTERS } from '../../constants/crystalColors'
import { ALL_PRODUCT_TAGS } from '../../constants/tags'
import type { ProductCategory, ProductFormData } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface ProductFormProps {
  onCreated: () => void
}

const initialForm: ProductFormData = {
  name: '',
  category: '手串',
  price: 0,
  stock: 1,
  is_hot: false,
  tags: [],
  description: '',
  coverFile: null,
  galleryFiles: [],
}

/** 後台：上架新商品表單（封面 + 多張詳情圖） */
export function ProductForm({ onCreated }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(initialForm)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      galleryPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [coverPreview, galleryPreviews])

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
    galleryPreviews.forEach((url) => URL.revokeObjectURL(url))
    setForm((prev) => ({ ...prev, galleryFiles: files }))
    setGalleryPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const removeGalleryImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      galleryFiles: prev.galleryFiles.filter((_, i) => i !== index),
    }))
    URL.revokeObjectURL(galleryPreviews[index])
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    galleryPreviews.forEach((url) => URL.revokeObjectURL(url))
    setForm(initialForm)
    setCoverPreview(null)
    setGalleryPreviews([])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name || form.price <= 0) {
      setMessage('請填寫名稱與價格')
      return
    }
    if (form.tags.length === 0) {
      setMessage('請至少勾選一個標籤')
      return
    }
    if (form.stock < 1) {
      setMessage('庫存至少 1 件')
      return
    }
    if (!form.coverFile) {
      setMessage('請上傳封面照片')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      await createProduct(form)
      resetForm()
      setMessage('上架成功！前台已同步')
      onCreated()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '上架失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassPanel className="p-6">
      <h3 className="font-display text-xl text-amber-glow">新增商品</h3>

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
          min={1}
          placeholder="庫存件數"
          value={form.stock || ''}
          onChange={(e) =>
            setForm({ ...form, stock: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={form.is_hot}
            onChange={(e) => setForm({ ...form, is_hot: e.target.checked })}
            className="rounded border-white/20 bg-void"
          />
          標記為熱門商品（前台右上角顯示「熱門」）
        </label>

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
                  name="category"
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

        <div>
          <p className="mb-2 text-xs text-white/50">水晶色</p>
          <div className="flex flex-wrap gap-2">
            {CRYSTAL_COLOR_FILTERS.map((color) => (
              <label
                key={color.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  form.tags.includes(color.label)
                    ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                    : 'border-white/10 text-white/50'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.tags.includes(color.label)}
                  onChange={() => toggleTag(color.label)}
                />
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color.hex }}
                />
                {color.label}
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
          <p className="mb-2 text-xs text-white/50">封面照片（列表與卡片顯示）</p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-amber-glow/30 py-8 transition hover:border-amber-glow/50">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="封面預覽"
                className="max-h-48 rounded object-cover"
              />
            ) : (
              <span className="text-sm text-white/40">點擊上傳封面</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs text-white/50">
            詳情相簿（可選，點進商品後可切換瀏覽）
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 py-6 transition hover:border-amber-glow/40">
            <span className="text-sm text-white/40">
              點擊上傳多張照片（可一次選多張）
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGalleryChange}
            />
          </label>
          {galleryPreviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {galleryPreviews.map((url, index) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt=""
                    className="h-20 w-20 rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-xs text-white"
                    aria-label="移除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-amber-glow/90 py-3 text-sm tracking-widest text-void disabled:opacity-50"
        >
          {submitting ? '上架中…' : '確認上架'}
        </button>
      </form>
    </GlassPanel>
  )
}
