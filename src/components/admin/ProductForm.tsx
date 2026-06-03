import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import { createProduct } from '../../lib/api/products'
import { PRODUCT_CATEGORIES } from '../../constants/categories'
import { CRYSTAL_COLOR_FILTERS } from '../../constants/crystalColors'
import { ALL_PRODUCT_TAGS } from '../../constants/tags'
import type { ProductCategory, ProductFormData } from '../../lib/types'
import { AdminProductGalleryEditor } from './AdminProductGalleryEditor'
import { AdminProductPricingFields } from './AdminProductPricingFields'
import { WatermarkedImageDownloadButton } from './WatermarkedImageDownloadButton'
import { downloadWatermarkedImage } from '../../lib/downloadWatermarkedImage'
import { moveListItem } from '../../lib/reorderList'
import { GlassPanel } from '../ui/GlassPanel'
import { IntegerField } from '../ui/IntegerField'
import { parseIntegerInput } from '../../lib/parseIntegerInput'

interface ProductFormProps {
  onCreated: () => void
}

const initialForm: ProductFormData = {
  name: '',
  category: '手串',
  price: 0,
  discount_zhe: null,
  stock: 1,
  is_hot: false,
  is_quick_add: false,
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
  const stockDraftRef = useRef(String(initialForm.stock))

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

  const appendGalleryFiles = (files: File[]) => {
    const previews = files.map((f) => URL.createObjectURL(f))
    setForm((prev) => ({
      ...prev,
      galleryFiles: [...prev.galleryFiles, ...files],
    }))
    setGalleryPreviews((prev) => [...prev, ...previews])
  }

  const removeGalleryImage = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index])
    setForm((prev) => ({
      ...prev,
      galleryFiles: prev.galleryFiles.filter((_, i) => i !== index),
    }))
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const moveGalleryImage = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => ({
      ...prev,
      galleryFiles: moveListItem(prev.galleryFiles, index, direction),
    }))
    setGalleryPreviews((prev) => moveListItem(prev, index, direction))
  }

  const downloadGalleryImage = async (index: number) => {
    const file = form.galleryFiles[index]
    if (!file) return
    await downloadWatermarkedImage(
      file,
      `${form.name || 'product'}-gallery-${index + 1}`
    )
  }

  const replaceGalleryImage = (index: number, file: File) => {
    URL.revokeObjectURL(galleryPreviews[index])
    setForm((prev) => {
      const files = [...prev.galleryFiles]
      files[index] = file
      return { ...prev, galleryFiles: files }
    })
    setGalleryPreviews((prev) => {
      const urls = [...prev]
      urls[index] = URL.createObjectURL(file)
      return urls
    })
  }

  const resetForm = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    galleryPreviews.forEach((url) => URL.revokeObjectURL(url))
    setForm(initialForm)
    stockDraftRef.current = String(initialForm.stock)
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
    const stock = parseIntegerInput(stockDraftRef.current, 1)
    if (stock < 1) {
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
      await createProduct({ ...form, stock })
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
        <AdminProductPricingFields
          price={form.price}
          discountZhe={form.discount_zhe}
          onPriceChange={(price) => setForm({ ...form, price })}
          onDiscountChange={(discount_zhe) =>
            setForm({ ...form, discount_zhe })
          }
        />
        <IntegerField
          min={1}
          placeholder="庫存件數"
          value={form.stock}
          onDraftChange={(text) => {
            stockDraftRef.current = text
          }}
          onChange={(stock) => setForm({ ...form, stock })}
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

        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={form.is_quick_add}
            onChange={(e) =>
              setForm({ ...form, is_quick_add: e.target.checked })
            }
            className="rounded border-white/20 bg-void"
          />
          推薦加購（顯示於購物車快捷推薦區）
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
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
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
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
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
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color.hex }}
                />
                {color.label}
              </label>
            ))}
          </div>
        </div>

        <textarea
          rows={10}
          placeholder="詳細描述"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-field min-h-[220px] resize-y"
        />

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/50">封面照片（列表與卡片顯示）</p>
            {form.coverFile && (
              <WatermarkedImageDownloadButton
                label="下載封面浮水印圖"
                onDownload={() =>
                  downloadWatermarkedImage(form.coverFile!, `${form.name || 'cover'}-cover`)
                }
              />
            )}
          </div>
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
            詳情相簿（可選，點進商品後可切換瀏覽；可用箭頭調整順序）
          </p>
          <AdminProductGalleryEditor
            items={galleryPreviews.map((url) => ({
              key: url,
              previewSrc: url,
              isNew: true,
            }))}
            onMove={moveGalleryImage}
            onRemove={removeGalleryImage}
            onReplace={replaceGalleryImage}
            onDownload={downloadGalleryImage}
            onAppendFiles={appendGalleryFiles}
            appendLabel="點擊追加相簿照片"
          />
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
