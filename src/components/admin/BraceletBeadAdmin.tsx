import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
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
import {
  fetchBraceletShopSettings,
  updateBeadsRestocking,
} from '../../lib/api/braceletShopSettings'
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
  const [beadsRestocking, setBeadsRestocking] = useState(false)
  const [restockingSaving, setRestockingSaving] = useState(false)

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
  const [listQuery, setListQuery] = useState('')
  const [listStatus, setListStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredBeads = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return beads.filter((bead) => {
      if (listStatus === 'active' && !bead.is_active) return false
      if (listStatus === 'inactive' && bead.is_active) return false
      if (!q) return true
      const hay = [
        bead.name,
        formatBeadElements(bead.elements),
        formatCrystalColorLabels(bead.colors),
        formatBeadSizes(bead.sizes),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [beads, listQuery, listStatus])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, settings] = await Promise.all([
        fetchAllBraceletBeads(),
        fetchBraceletShopSettings(),
      ])
      setBeads(rows)
      setBeadsRestocking(settings.beads_restocking)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleRestockingToggle = async (enabled: boolean) => {
    setRestockingSaving(true)
    setMessage('')
    const previous = beadsRestocking
    setBeadsRestocking(enabled)
    try {
      const next = await updateBeadsRestocking(enabled)
      setBeadsRestocking(next.beads_restocking)
      setMessage(
        next.beads_restocking
          ? '已開啟「補貨中」提示（前台自行配珠可見）'
          : '已關閉「補貨中」提示'
      )
    } catch (err) {
      setBeadsRestocking(previous)
      setMessage(err instanceof Error ? err.message : '更新補貨狀態失敗')
    } finally {
      setRestockingSaving(false)
    }
  }
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
        <h2 className="font-display text-xl text-amber-glow">配置器提示</h2>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-amber-glow"
            checked={beadsRestocking}
            disabled={restockingSaving || loading}
            onChange={(e) => void handleRestockingToggle(e.target.checked)}
          />
          <span>
            <span className="block text-sm text-white">補貨中</span>
            <span className="mt-1 block text-xs leading-relaxed text-white/45">
              勾選後，前台「自行配珠」會顯示：部分珠子補貨中，可至許願區許願或等待官方上架。
            </span>
          </span>
        </label>
      </GlassPanel>

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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-amber-glow">珠材列表</h2>
            {!loading && beads.length > 0 && (
              <p className="mt-0.5 text-xs text-white/40">
                顯示 {filteredBeads.length} / {beads.length}
                <span className="ml-2 inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                  上架
                </span>
                <span className="ml-1.5 inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400/80" aria-hidden />
                  下架
                </span>
              </p>
            )}
          </div>
          {beads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="搜尋名稱／五行／顏色／咪數"
                className="w-44 rounded border border-white/15 bg-black/30 px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 sm:w-56"
              />
              <select
                value={listStatus}
                onChange={(e) =>
                  setListStatus(e.target.value as 'all' | 'active' | 'inactive')
                }
                className="rounded border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
              >
                <option value="all">全部</option>
                <option value="active">上架中</option>
                <option value="inactive">已下架</option>
              </select>
            </div>
          )}
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-white/45">載入中…</p>
        ) : beads.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">尚無珠材，請先新增。</p>
        ) : filteredBeads.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">沒有符合條件的珠材。</p>
        ) : (
          <ul className="mt-3 max-h-[min(28rem,55vh)] space-y-1.5 overflow-y-auto pr-1">
            {filteredBeads.map((bead) => (
              <li
                key={bead.id}
                className={`flex items-center gap-2 rounded border px-2 py-1.5 transition ${
                  bead.is_active
                    ? 'border-emerald-400/30 bg-emerald-950/20'
                    : 'border-rose-400/25 bg-rose-950/15 opacity-75'
                }`}
              >
                {bead.image_url ? (
                  <img
                    src={bead.image_url}
                    alt=""
                    className={`h-8 w-8 shrink-0 rounded-full object-cover ${
                      bead.is_active ? '' : 'grayscale'
                    }`}
                  />
                ) : (
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs text-amber-glow ${
                      bead.is_active ? 'bg-white/5' : 'bg-white/5 grayscale'
                    }`}
                  >
                    ✦
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium leading-tight ${
                      bead.is_active ? 'text-white' : 'text-white/55'
                    }`}
                  >
                    {bead.name}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-white/40">
                    {formatBeadElements(bead.elements)}
                    {' · '}
                    {formatCrystalColorLabels(bead.colors)}
                    {' · '}
                    {formatBeadSizes(bead.sizes)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(bead)}
                    className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-white/70"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(bead)}
                    className={`rounded border px-2 py-0.5 text-[11px] ${
                      bead.is_active
                        ? 'border-rose-400/40 text-rose-300 hover:bg-rose-400/10'
                        : 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'
                    }`}
                  >
                    {bead.is_active ? '下架' : '上架'}
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(bead)}
                      className="rounded border border-red-400/30 px-2 py-0.5 text-[11px] text-red-300/80"
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
