import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { FiveElement } from '../../constants/fiveElements'
import type { BeadSizeCategory } from '../../constants/beadSizes'
import { formatBeadSizes } from '../../constants/beadSizes'
import { formatCrystalColorLabels, inferBeadCrystalColorLabels } from '../../constants/crystalColors'
import {
  createBraceletBead,
  deleteBraceletBead,
  fetchAllBraceletBeads,
  updateBraceletBead,
  type BraceletBead,
} from '../../lib/api/beads'
import { formatBeadElements } from '../../lib/braceletConfig'
import { BROWSER_IMAGE_ACCEPT } from '../../lib/browserImage'
import { AdminBeadSizesPicker } from './AdminBeadSizesPicker'
import { AdminCrystalColorsPicker } from './AdminCrystalColorsPicker'
import { AdminEfficacyTagsPicker } from './AdminEfficacyTagsPicker'
import { AdminFiveElementsPicker } from './AdminFiveElementsPicker'
import { CircularImageCropModal } from './CircularImageCropModal'
import { GlassPanel } from '../ui/GlassPanel'
import { useAdminSession } from '../../hooks/useAdminSession'

/** 後台：手串配置珠材庫 */
export function BraceletBeadAdmin() {
  const { isSuperAdmin } = useAdminSession()
  const [beads, setBeads] = useState<BraceletBead[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [name, setName] = useState('')
  const [elements, setElements] = useState<FiveElement[]>(['土'])
  const [sizes, setSizes] = useState<BeadSizeCategory[]>(['7-9'])
  const [colors, setColors] = useState<string[]>([])
  const [efficacyTags, setEfficacyTags] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [adminNotes, setAdminNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [cropSourceName, setCropSourceName] = useState('bead')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setBeads(await fetchAllBraceletBeads())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const revokePreview = () => {
    if (preview) URL.revokeObjectURL(preview)
  }

  const resetForm = () => {
    revokePreview()
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    setName('')
    setElements(['土'])
    setSizes(['7-9'])
    setColors([])
    setEfficacyTags([])
    setIsActive(true)
    setAdminNotes('')
    setFile(null)
    setPreview(null)
    setCropSourceUrl(null)
    setEditingId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!next) return
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    setCropSourceName(next.name || 'bead')
    setCropSourceUrl(URL.createObjectURL(next))
  }

  const handleCropCancel = () => {
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    setCropSourceUrl(null)
  }

  const handleCropConfirm = (cropped: File, previewUrl: string) => {
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    revokePreview()
    setCropSourceUrl(null)
    setFile(cropped)
    setPreview(previewUrl)
  }

  const startEdit = (bead: BraceletBead) => {
    revokePreview()
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    setEditingId(bead.id)
    setName(bead.name)
    setElements(bead.elements.length > 0 ? [...bead.elements] : ['土'])
    setSizes(bead.sizes.length > 0 ? [...bead.sizes] : ['7-9'])
    setColors(
      bead.colors.length > 0
        ? [...bead.colors]
        : inferBeadCrystalColorLabels(bead.name)
    )
    setEfficacyTags(bead.efficacy_tags)
    setIsActive(bead.is_active)
    setAdminNotes(bead.admin_notes ?? '')
    setFile(null)
    setPreview(null)
    setCropSourceUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      if (editingId) {
        await updateBraceletBead(editingId, {
          name,
          elements,
          sizes,
          colors,
          efficacy_tags: efficacyTags,
          is_active: isActive,
          admin_notes: adminNotes,
          imageFile: file,
        })
        setMessage('珠材已更新')
      } else {
        await createBraceletBead({
          name,
          elements,
          sizes,
          colors,
          efficacy_tags: efficacyTags,
          is_active: isActive,
          admin_notes: adminNotes,
          imageFile: file,
        })
        setMessage('已新增珠材')
      }
      resetForm()
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (bead: BraceletBead) => {
    try {
      await updateBraceletBead(bead.id, { is_active: !bead.is_active })
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失敗')
    }
  }

  const handleDelete = async (bead: BraceletBead) => {
    if (!isSuperAdmin) return
    if (!window.confirm(`確定刪除珠材「${bead.name}」？`)) return
    try {
      await deleteBraceletBead(bead.id)
      if (editingId === bead.id) resetForm()
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  const editingImageUrl =
    editingId && !preview
      ? beads.find((b) => b.id === editingId)?.image_url
      : null

  return (
    <div className="space-y-6">
      {cropSourceUrl && (
        <CircularImageCropModal
          imageUrl={cropSourceUrl}
          fileName={cropSourceName}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}

      <GlassPanel className="p-5 sm:p-6">
        <h2 className="font-display text-xl text-amber-glow">
          {editingId ? '編輯珠材' : '新增珠材'}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          客戶配置器會顯示已上架珠材；五行／顏色／功效可複選。上傳圖片後可圓形裁切。
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <label className="block text-sm text-white/70">
            名稱
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (colors.length === 0 && name.trim()) {
                  setColors(inferBeadCrystalColorLabels(name.trim()))
                }
              }}
              required
              className="mt-1 w-full rounded border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <AdminFiveElementsPicker value={elements} onChange={setElements} />
          <AdminCrystalColorsPicker value={colors} onChange={setColors} />
          <AdminBeadSizesPicker value={sizes} onChange={setSizes} />
          <div>
            <p className="text-sm text-white/70">功效類別</p>
            <div className="mt-2">
              <AdminEfficacyTagsPicker value={efficacyTags} onChange={setEfficacyTags} />
            </div>
          </div>
          <label className="block text-sm text-white/70">
            珠材圖片（選完後可拖曳／縮放圓形範圍）
            <input
              ref={fileInputRef}
              type="file"
              accept={BROWSER_IMAGE_ACCEPT}
              onChange={handleFile}
              className="mt-1 block w-full text-sm text-white/60"
            />
          </label>
          {(preview || editingImageUrl) && (
            <div className="flex items-center gap-3">
              <img
                src={preview || editingImageUrl || ''}
                alt=""
                className="h-20 w-20 rounded-full border border-amber-glow/30 object-cover bg-black/30"
              />
              {preview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/60"
                >
                  重新裁切
                </button>
              )}
            </div>
          )}
          <label className="block text-sm text-white/70">
            後台備註（客戶不可見）
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            上架（客戶可見）
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded border border-amber-glow/40 bg-amber-glow/15 px-4 py-2 text-sm text-amber-glow disabled:opacity-40"
            >
              {submitting ? '儲存中…' : editingId ? '更新珠材' : '新增珠材'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-white/15 px-4 py-2 text-sm text-white/60"
              >
                取消編輯
              </button>
            )}
          </div>
        </form>
        {message && (
          <p className="mt-3 text-sm text-amber-glow/80" role="status">
            {message}
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6">
        <h2 className="font-display text-xl text-amber-glow">珠材列表</h2>
        {loading ? (
          <p className="mt-3 text-sm text-white/45">載入中…</p>
        ) : beads.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">尚無珠材，請先新增。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {beads.map((bead) => (
              <li
                key={bead.id}
                className="flex flex-wrap items-center gap-3 rounded border border-white/10 bg-black/20 p-3"
              >
                {bead.image_url ? (
                  <img
                    src={bead.image_url}
                    alt={bead.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-amber-glow">
                    ✦
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{bead.name}</p>
                  <p className="text-xs text-white/45">
                    {formatBeadElements(bead.elements)}
                    {' · '}
                    {formatCrystalColorLabels(bead.colors)}
                    {' · '}
                    {formatBeadSizes(bead.sizes)}
                    {bead.efficacy_tags.length > 0
                      ? ` · ${bead.efficacy_tags.join('、')}`
                      : ''}
                    {bead.is_active ? '' : ' · 已下架'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(bead)}
                    className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/70"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(bead)}
                    className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/70"
                  >
                    {bead.is_active ? '下架' : '上架'}
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(bead)}
                      className="rounded border border-red-400/30 px-2.5 py-1 text-xs text-red-300/80"
                    >
                      刪除
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  )
}
