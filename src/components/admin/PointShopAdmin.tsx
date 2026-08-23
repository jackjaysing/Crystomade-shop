import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  createPointProduct,
  fetchAllPointProducts,
  updatePointProduct,
} from '../../lib/api/pointProducts'
import { downloadWatermarkedImage } from '../../lib/downloadWatermarkedImage'
import { adminProductThumbAlt, pointProductPhotoAlt } from '../../lib/imageAlt'
import type { PointProduct } from '../../lib/types'
import { PointProductEditModal } from './PointProductEditModal'
import { WatermarkedImageDownloadButton } from './WatermarkedImageDownloadButton'
import { GlassPanel } from '../ui/GlassPanel'

/** 後台：點數商城（新增／列表／編輯，模式對齊商品管理） */
export function PointShopAdmin() {
  const [products, setProducts] = useState<PointProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<PointProduct | null>(null)

  const [name, setName] = useState('')
  const [requiredPoints, setRequiredPoints] = useState(100)
  const [stock, setStock] = useState(10)
  const [isActive, setIsActive] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setProducts(await fetchAllPointProducts())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null
    setFile(next)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next ? URL.createObjectURL(next) : null
    })
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setMessage('請上傳商品圖片')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await createPointProduct({
        name,
        required_points: requiredPoints,
        stock,
        is_active: isActive,
        imageFile: file,
      })
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setName('')
      setRequiredPoints(100)
      setStock(10)
      setIsActive(true)
      setFile(null)
      setMessage('已新增點數商品')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (p: PointProduct) => {
    try {
      await updatePointProduct(p.id, { is_active: !p.is_active })
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失敗')
    }
  }

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h2 className="font-display text-xl text-white">新增兌換商品</h2>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-4">
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
            立即上架
          </label>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-white/50">商品圖片 *</p>
              {file && (
                <WatermarkedImageDownloadButton
                  label="下載浮水印圖"
                  onDownload={() =>
                    downloadWatermarkedImage(file, `${name || 'point-product'}-cover`)
                  }
                />
              )}
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-amber-glow/30 py-8 transition hover:border-amber-glow/50">
              {preview ? (
                <img
                  src={preview}
                  alt={pointProductPhotoAlt(name || '點數商品預覽')}
                  className="max-h-48 rounded object-cover"
                />
              ) : (
                <span className="text-sm text-white/40">點擊上傳商品圖片</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.includes('已') ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-amber-glow/90 px-6 py-2.5 text-sm font-medium text-void disabled:opacity-50"
          >
            {submitting ? '新增中…' : '新增商品'}
          </button>
        </form>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h2 className="font-display text-xl text-white">兌換商品列表</h2>
        {loading ? (
          <p className="mt-4 text-sm text-white/40">載入中…</p>
        ) : products.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">尚無點數商品</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <img
                  src={p.image_url}
                  alt={adminProductThumbAlt(p.name)}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="mt-1 text-sm text-amber-glow/90">
                    {p.required_points.toLocaleString()} 點
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    庫存 {p.stock} · {p.is_active ? '上架中' : '已下架'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="rounded-lg border border-amber-glow/35 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(p)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-amber-glow/40 hover:text-amber-glow"
                  >
                    {p.is_active ? '下架' : '上架'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      {editing && (
        <PointProductEditModal
          key={editing.id}
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}
