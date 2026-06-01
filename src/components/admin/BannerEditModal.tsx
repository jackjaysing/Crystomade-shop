import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { updateBanner } from '../../lib/api/banners'
import type { AnnouncementBanner, BannerEditData } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface BannerEditModalProps {
  banner: AnnouncementBanner
  onClose: () => void
  onSaved: () => void
}

function toEditForm(banner: AnnouncementBanner): BannerEditData {
  return {
    name: banner.name,
    link_url: banner.link_url ?? '',
    imageFile: null,
  }
}

/** 後台：編輯公告橫幅 */
export function BannerEditModal({ banner, onClose, onSaved }: BannerEditModalProps) {
  const [form, setForm] = useState<BannerEditData>(() => toEditForm(banner))
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setForm(toEditForm(banner))
    setImagePreview(null)
    setMessage('')
  }, [banner])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, imageFile: file }))
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setMessage('請填寫橫幅名稱')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      await updateBanner(banner.id, {
        name: form.name,
        link_url: form.link_url,
        imageFile: form.imageFile,
      })
      onSaved()
      onClose()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="banner-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="關閉"
        onClick={onClose}
      />

      <GlassPanel className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h2 id="banner-edit-title" className="font-display text-xl text-amber-glow">
          編輯公告橫幅
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-xs text-white/50">橫幅名稱</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="例如：春節限定優惠"
              className="input-field w-full"
              maxLength={60}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-white/50">點擊跳轉連結（選填）</label>
            <input
              type="url"
              value={form.link_url}
              onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
              placeholder="https://"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-white/50">橫幅圖片</label>
            <img
              src={imagePreview ?? banner.image_url}
              alt={banner.name || '橫幅預覽'}
              className="mb-3 max-h-40 w-full rounded-lg object-cover"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-white/60 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-glow/20 file:px-4 file:py-2 file:text-sm file:text-amber-glow"
            />
            <p className="mt-1 text-xs text-white/35">不選擇檔案則保留原圖</p>
          </div>

          {message && (
            <p className={`text-sm ${message.includes('失敗') || message.includes('請') ? 'text-red-300' : 'text-emerald-400'}`}>
              {message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/15 py-3 text-sm text-white/60 transition hover:text-white/80"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-amber-glow/90 py-3 text-sm font-medium text-void transition hover:bg-amber-glow disabled:opacity-50"
            >
              {submitting ? '儲存中…' : '儲存變更'}
            </button>
          </div>
        </form>
      </GlassPanel>
    </div>
  )
}
