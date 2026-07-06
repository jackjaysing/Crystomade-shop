import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { createProduct } from '../../lib/api/products'
import {
  BRACELET_STYLES,
  DEFAULT_BRACELET_STYLE,
} from '../../constants/braceletStyles'
import { defaultSubcategoryForCategory } from '../../constants/productSubcategories'
import { PRODUCT_CATEGORIES } from '../../constants/categories'
import { CRYSTAL_COLOR_FILTERS } from '../../constants/crystalColors'
import { ALL_PRODUCT_TAGS } from '../../constants/tags'
import type { BraceletStyle, ProductCategory, ProductFormData } from '../../lib/types'
import { AdminFiveElementsPicker } from './AdminFiveElementsPicker'
import { AdminProductSubcategoryPicker } from './AdminProductSubcategoryPicker'
import { AdminProductGalleryEditor } from './AdminProductGalleryEditor'
import { AdminProductPricingFields } from './AdminProductPricingFields'
import { WatermarkedImageDownloadButton } from './WatermarkedImageDownloadButton'
import { downloadWatermarkedImage } from '../../lib/downloadWatermarkedImage'
import { moveListItem } from '../../lib/reorderList'
import { GlassPanel } from '../ui/GlassPanel'
import { IntegerField } from '../ui/IntegerField'
import { parseIntegerInput } from '../../lib/parseIntegerInput'
import { productPhotoAlt } from '../../lib/imageAlt'

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const initialForm: ProductFormData = {
  name: '',
  category: '手串',
  bracelet_style: DEFAULT_BRACELET_STYLE,
  subcategory: null,
  price: 0,
  discount_zhe: null,
  stock: 1,
  is_hot: false,
  is_quick_add: false,
  generates_soul_card: true,
  tags: [],
  five_elements: [],
  description: '',
  coverFile: null,
  galleryFiles: [],
}

/** 後台：上架新商品表單（彈窗 · 封面 + 多張詳情圖） */
export function ProductForm({ open, onClose, onCreated }: ProductFormProps) {
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
      onCreated()
      onClose()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '上架失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-create-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="關閉"
      />

      <GlassPanel className="relative z-10 flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h3 id="product-create-title" className="font-display text-xl text-amber-glow">
              新增商品
            </h3>
            <p className="mt-1 text-xs text-white/35">上架後前台會立即同步</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white"
            aria-label="關閉視窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
        >
          <div className="space-y-4">
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

        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={form.generates_soul_card}
            onChange={(e) =>
              setForm({ ...form, generates_soul_card: e.target.checked })
            }
            className="rounded border-white/20 bg-void"
          />
          付款後發行水晶魔法身分證（魔導書）
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
                  onChange={() => {
                    const category = cat.id as ProductCategory
                    setForm({
                      ...form,
                      category,
                      bracelet_style:
                        category === '手串'
                          ? form.bracelet_style ?? DEFAULT_BRACELET_STYLE
                          : null,
                      subcategory: defaultSubcategoryForCategory(category),
                    })
                  }}
                />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        {form.category === '手串' ? (
          <div>
            <p className="mb-2 text-xs text-white/50">手串分類</p>
            <div className="flex flex-wrap gap-2">
              {BRACELET_STYLES.map((style) => (
                <label
                  key={style.id}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                    form.bracelet_style === style.id
                      ? 'border-amber-glow bg-amber-glow/10 text-amber-glow'
                      : 'border-white/10 text-white/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bracelet_style"
                    className="sr-only"
                    checked={form.bracelet_style === style.id}
                    onChange={() =>
                      setForm({
                        ...form,
                        bracelet_style: style.id as BraceletStyle,
                      })
                    }
                  />
                  {style.label}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <AdminProductSubcategoryPicker
            category={form.category}
            value={form.subcategory}
            onChange={(subcategory) => setForm({ ...form, subcategory })}
          />
        )}

        <AdminFiveElementsPicker
          value={form.five_elements}
          onChange={(five_elements) => setForm({ ...form, five_elements })}
        />

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
                alt={productPhotoAlt(form.name || '新商品封面')}
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
            productName={form.name || '新商品'}
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
          </div>
        </form>
      </GlassPanel>
    </div>,
    document.body
  )
}
