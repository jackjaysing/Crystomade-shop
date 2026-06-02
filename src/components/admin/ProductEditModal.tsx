import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { updateProduct, deleteProduct } from '../../lib/api/products'
import { PRODUCT_CATEGORIES } from '../../constants/categories'
import { CRYSTAL_COLOR_FILTERS } from '../../constants/crystalColors'
import { ALL_PRODUCT_TAGS } from '../../constants/tags'
import type { Product, ProductCategory, ProductEditData } from '../../lib/types'
import { AdminProductGalleryEditor } from './AdminProductGalleryEditor'
import { AdminProductPricingFields } from './AdminProductPricingFields'
import { WatermarkedImageDownloadButton } from './WatermarkedImageDownloadButton'
import { downloadWatermarkedImage } from '../../lib/downloadWatermarkedImage'
import { moveListItem } from '../../lib/reorderList'
import type { ProductGalleryEditItem } from '../../lib/types'
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
    discount_zhe: product.discount_zhe,
    tags: [...product.tags],
    description: product.description,
    stock: product.stock,
    is_hot: product.is_hot,
    is_quick_add: product.is_quick_add,
    coverFile: null,
    galleryItems: product.gallery_urls.map((url) => ({
      kind: 'existing' as const,
      url,
    })),
  }
}

function revokeNewGalleryPreviews(items: ProductGalleryEditItem[]) {
  for (const item of items) {
    if (item.kind === 'new') URL.revokeObjectURL(item.previewUrl)
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
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    setForm((prev) => {
      revokeNewGalleryPreviews(prev.galleryItems)
      return toEditForm(product)
    })
    setCoverPreview(null)
    setMessage('')
    scrollRef.current?.scrollTo({ top: 0 })
  }, [product])

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

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
    const newItems: ProductGalleryEditItem[] = files.map((file) => ({
      kind: 'new',
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setForm((prev) => ({
      ...prev,
      galleryItems: [...prev.galleryItems, ...newItems],
    }))
  }

  const removeGalleryItem = (index: number) => {
    setForm((prev) => {
      const removed = prev.galleryItems[index]
      if (removed?.kind === 'new') URL.revokeObjectURL(removed.previewUrl)
      return {
        ...prev,
        galleryItems: prev.galleryItems.filter((_, i) => i !== index),
      }
    })
  }

  const moveGalleryItem = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => ({
      ...prev,
      galleryItems: moveListItem(prev.galleryItems, index, direction),
    }))
  }

  const downloadGalleryItem = async (index: number) => {
    const item = form.galleryItems[index]
    if (!item) return
    const source = item.kind === 'new' ? item.file : item.url
    await downloadWatermarkedImage(
      source,
      `${form.name || product.name}-gallery-${index + 1}`
    )
  }

  const downloadCoverImage = async () => {
    const source = form.coverFile ?? product.image_url
    await downloadWatermarkedImage(
      source,
      `${form.name || product.name}-cover`
    )
  }

  const replaceGalleryItem = (index: number, file: File) => {
    setForm((prev) => {
      const next = [...prev.galleryItems]
      const old = next[index]
      if (old?.kind === 'new') URL.revokeObjectURL(old.previewUrl)
      next[index] = {
        kind: 'new',
        file,
        previewUrl: URL.createObjectURL(file),
      }
      return { ...prev, galleryItems: next }
    })
  }

  const galleryEditorItems = form.galleryItems.map((item) => ({
    key:
      item.kind === 'existing'
        ? `existing-${item.url}`
        : `new-${item.previewUrl}`,
    previewSrc: item.kind === 'existing' ? item.url : item.previewUrl,
    isNew: item.kind === 'new',
  }))

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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn sm:items-center sm:justify-center sm:p-4"
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

      <GlassPanel className="relative z-10 flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h3 id="product-edit-title" className="font-display text-xl text-amber-glow">
              編輯商品
            </h3>
            <p className="mt-1 truncate text-xs text-white/40">{product.name}</p>
            <p className="mt-0.5 text-xs text-white/35">修改後前台會立即同步</p>
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
          id="product-edit-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
          >
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

          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.is_hot}
              onChange={(e) =>
                setForm({ ...form, is_hot: e.target.checked })
              }
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
              <p className="text-xs text-white/50">
                封面照片（不上傳則保留原圖）
              </p>
              <WatermarkedImageDownloadButton
                label="下載封面浮水印圖"
                onDownload={downloadCoverImage}
              />
            </div>
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
            <p className="mb-2 text-xs text-white/50">
              詳情相簿（封面之後的順序，可用箭頭調整）
            </p>
            <AdminProductGalleryEditor
              items={galleryEditorItems}
              onMove={moveGalleryItem}
              onRemove={removeGalleryItem}
              onReplace={replaceGalleryItem}
              onDownload={downloadGalleryItem}
              onAppendFiles={appendGalleryFiles}
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
          </div>
        </form>

        <div className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
          <div className="flex gap-3">
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
              form="product-edit-form"
              disabled={busy}
              className="flex-1 rounded-lg bg-amber-glow/90 py-3 text-sm tracking-widest text-void disabled:opacity-50"
            >
              {submitting ? '儲存中…' : '儲存更新'}
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>,
    document.body
  )
}
