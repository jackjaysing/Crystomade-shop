import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { deletePointProduct, updatePointProduct } from '../../lib/api/pointProducts'
import { downloadWatermarkedImage } from '../../lib/downloadWatermarkedImage'
import { pointProductPhotoAlt } from '../../lib/imageAlt'
import type { PointProduct } from '../../lib/types'
import { useAdminSession } from '../../hooks/useAdminSession'
import { WatermarkedImageDownloadButton } from './WatermarkedImageDownloadButton'
import { GlassPanel } from '../ui/GlassPanel'

interface PointProductEditModalProps {
  product: PointProduct
  onClose: () => void
  onSaved: () => void
}

/** 後台：編輯點數商城商品（模式對齊商品編輯） */
export function PointProductEditModal({
  product,
  onClose,
  onSaved,
}: PointProductEditModalProps) {
  const { isSuperAdmin } = useAdminSession()
  const [name, setName] = useState(product.name)
  const [requiredPoints, setRequiredPoints] = useState(product.required_points)
  const [stock, setStock] = useState(product.stock)
  const [isActive, setIsActive] = useState(product.is_active)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    setName(product.name)
    setRequiredPoints(product.required_points)
    setStock(product.stock)
    setIsActive(product.is_active)
    setImageFile(null)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setMessage('')
  }, [product])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const coverDisplay = preview ?? product.image_url
  const busy = submitting || deleting

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  const downloadCoverImage = async () => {
    const source = imageFile ?? product.image_url
    await downloadWatermarkedImage(source, `${name || product.name}-cover`)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setMessage('請填寫商品名稱')
      return
    }
    if (requiredPoints <= 0) {
      setMessage('所需點數須大於 0')
      return
    }
    if (stock < 0) {
      setMessage('庫存不可為負數')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      await updatePointProduct(product.id, {
        name: name.trim(),
        required_points: requiredPoints,
        stock,
        is_active: isActive,
        imageFile,
      })
      onSaved()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`確定刪除「${product.name}」？此操作無法復原。`)) return
    setDeleting(true)
    setMessage('')
    try {
      await deletePointProduct(product.id)
      onSaved()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setDeleting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-void/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="point-product-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={() => {
          if (!busy) onClose()
        }}
        aria-label="關閉編輯"
      />
      <GlassPanel className="relative z-10 flex max-h-[min(92vh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-white/15 p-0 sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3
              id="point-product-edit-title"
              className="font-display text-xl text-white"
            >
              編輯兌換商品
            </h3>
            <p className="mt-1 truncate text-sm text-white/45">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-amber-glow/50 hover:text-amber-glow disabled:opacity-50"
            aria-label="關閉"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <input
              required
              placeholder="商品名稱 *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-white/50">所需點數 *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={requiredPoints}
                  onChange={(e) => setRequiredPoints(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">庫存 *</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-white/20"
              />
              上架中（前台可見）
            </label>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-white/50">
                  商品圖片（不上傳則保留原圖）
                  <span className="mt-1 block text-[11px] text-white/35">
                    手機下載會開啟分享選單，或長按圖片儲存
                  </span>
                </p>
                <WatermarkedImageDownloadButton
                  key={`${product.id}-cover-download`}
                  label="下載浮水印圖"
                  onDownload={downloadCoverImage}
                />
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-amber-glow/30 py-8 transition hover:border-amber-glow/50">
                <img
                  src={coverDisplay}
                  alt={pointProductPhotoAlt(name || product.name)}
                  className="max-h-48 rounded object-cover"
                />
                <span className="mt-2 text-xs text-white/40">點擊更換圖片</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </label>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes('成功') || message.includes('已')
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              >
                {message}
              </p>
            )}

            {isSuperAdmin && (
              <div className="border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className="w-full rounded-lg border border-red-400/40 py-3 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {deleting ? '刪除中…' : '刪除此商品'}
                </button>
              </div>
            )}
          </div>

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
                disabled={busy}
                className="flex-1 rounded-lg bg-amber-glow/90 py-3 text-sm font-medium text-void disabled:opacity-50"
              >
                {submitting ? '儲存中…' : '儲存變更'}
              </button>
            </div>
          </div>
        </form>
      </GlassPanel>
    </div>,
    document.body
  )
}
