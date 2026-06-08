import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  createBanner,
  deleteBanner,
  swapBannerOrder,
  updateBanner,
} from '../../lib/api/banners'
import type { AnnouncementBanner } from '../../lib/types'
import { useAdminSession } from '../../hooks/useAdminSession'
import { BannerEditModal } from './BannerEditModal'
import { GlassPanel } from '../ui/GlassPanel'

interface BannerAdminProps {
  banners: AnnouncementBanner[]
  onUpdated: () => void
}

function displayBannerName(name: string): string {
  return name.trim() || '（未命名）'
}

/** 後台：公告橫幅上傳與管理 */
export function BannerAdmin({ banners, onUpdated }: BannerAdminProps) {
  const { isSuperAdmin } = useAdminSession()
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [editingBanner, setEditingBanner] = useState<AnnouncementBanner | null>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(next ? URL.createObjectURL(next) : null)
  }

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setMessage('請填寫橫幅名稱')
      return
    }
    if (!file) {
      setMessage('請選擇橫幅圖片')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      await createBanner(file, { name, linkUrl })
      if (preview) URL.revokeObjectURL(preview)
      setName('')
      setFile(null)
      setPreview(null)
      setLinkUrl('')
      setMessage('橫幅已新增')
      onUpdated()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (banner: AnnouncementBanner) => {
    try {
      await updateBanner(banner.id, { is_active: !banner.is_active })
      onUpdated()
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失敗')
    }
  }

  const handleMove = async (bannerId: string, direction: 'up' | 'down') => {
    try {
      await swapBannerOrder(bannerId, direction, banners)
      onUpdated()
    } catch (err) {
      alert(err instanceof Error ? err.message : '排序失敗')
    }
  }

  const handleDelete = async (banner: AnnouncementBanner) => {
    if (!confirm(`確定刪除「${displayBannerName(banner.name)}」？`)) return
    try {
      await deleteBanner(banner.id)
      onUpdated()
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  return (
    <>
      <GlassPanel className="p-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs text-white/50">橫幅名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：春節限定優惠"
              className="input-field w-full"
              maxLength={60}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-white/50">上傳橫幅圖片</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-white/60 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-glow/20 file:px-4 file:py-2 file:text-sm file:text-amber-glow"
            />
            {preview && (
              <img
                src={preview}
                alt="預覽"
                className="mt-3 max-h-40 w-full rounded-lg object-cover"
              />
            )}
          </div>

          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="點擊跳轉連結（選填）"
            className="input-field w-full"
          />

          <button
            type="submit"
            disabled={submitting || !file || !name.trim()}
            className="w-full rounded-lg bg-amber-glow/90 py-3 text-sm font-medium text-void transition hover:bg-amber-glow disabled:opacity-50"
          >
            {submitting ? '上傳中…' : '新增橫幅'}
          </button>

          {message && (
            <p className={`text-sm ${message.includes('已') ? 'text-emerald-400' : 'text-red-300'}`}>
              {message}
            </p>
          )}
        </form>

        <ul className="mt-6 divide-y divide-white/5">
          {banners.length === 0 && (
            <li className="py-6 text-center text-sm text-white/40">尚無公告橫幅</li>
          )}
          {banners.map((banner, index) => (
            <li key={banner.id} className="flex flex-wrap items-center gap-4 py-4">
              <img
                src={banner.image_url}
                alt={displayBannerName(banner.name)}
                className="h-20 w-36 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{displayBannerName(banner.name)}</p>
                <p className="mt-1 text-sm text-white/50">
                  排序 {banner.sort_order + 1}
                  {!banner.is_active && (
                    <span className="ml-2 text-xs text-white/40">（已停用）</span>
                  )}
                </p>
                {banner.link_url && (
                  <p className="mt-1 truncate text-xs text-white/40">{banner.link_url}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBanner(banner)}
                  className="rounded border border-amber-glow/40 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10"
                >
                  編輯
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(banner.id, 'up')}
                  disabled={index === 0}
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30"
                >
                  上移
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(banner.id, 'down')}
                  disabled={index === banners.length - 1}
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30"
                >
                  下移
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(banner)}
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/60"
                >
                  {banner.is_active ? '停用' : '啟用'}
                </button>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(banner)}
                    className="rounded border border-red-400/30 px-3 py-1.5 text-xs text-red-300"
                  >
                    刪除
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>

      {editingBanner && (
        <BannerEditModal
          banner={editingBanner}
          onClose={() => setEditingBanner(null)}
          onSaved={() => {
            onUpdated()
            setEditingBanner(null)
          }}
        />
      )}
    </>
  )
}
