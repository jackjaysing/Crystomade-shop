import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  CIRCULAR_CROP_OUTPUT_SIZE,
  CIRCULAR_CROP_VIEW_SIZE,
  CIRCULAR_CROP_ZOOM_MAX,
  CIRCULAR_CROP_ZOOM_MIN,
  circularCropCoverScale,
  exportCircularCroppedPng,
  loadImageFromUrl,
  type CircularCropTransform,
} from '../../lib/circularImageCrop'

interface CircularImageCropModalProps {
  /** 原始圖 object URL 或遠端 URL */
  imageUrl: string
  /** 產出檔名基底 */
  fileName?: string
  onCancel: () => void
  onConfirm: (file: File, previewUrl: string) => void
}

/** 圓形裁切：拖曳移動、滑桿／滾輪縮放 */
export function CircularImageCropModal({
  imageUrl,
  fileName,
  onCancel,
  onConfirm,
}: CircularImageCropModalProps) {
  const viewRef = useRef<HTMLDivElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [exporting, setExporting] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setImg(null)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    void loadImageFromUrl(imageUrl)
      .then((loaded) => {
        if (!cancelled) setImg(loaded)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : '無法載入圖片')
        }
      })
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  const coverScale = img
    ? circularCropCoverScale(img.naturalWidth, img.naturalHeight, CIRCULAR_CROP_VIEW_SIZE)
    : 1
  const scale = coverScale * zoom
  const displayW = img ? img.naturalWidth * scale : 0
  const displayH = img ? img.naturalHeight * scale : 0

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!img) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    setOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    })
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null
    }
  }

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    setZoom((prev) => {
      const next = prev + (e.deltaY < 0 ? 0.08 : -0.08)
      return Math.min(CIRCULAR_CROP_ZOOM_MAX, Math.max(CIRCULAR_CROP_ZOOM_MIN, next))
    })
  }, [])

  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const handleConfirm = async () => {
    if (!img) return
    setExporting(true)
    try {
      const transform: CircularCropTransform = {
        offsetX: offset.x,
        offsetY: offset.y,
        zoom,
      }
      const file = await exportCircularCroppedPng(img, transform, {
        outputSize: CIRCULAR_CROP_OUTPUT_SIZE,
        fileName: fileName || 'bead-crop',
      })
      const previewUrl = URL.createObjectURL(file)
      onConfirm(file, previewUrl)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '裁切失敗')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="circular-crop-title"
    >
      <div className="w-full max-w-md rounded-xl border border-amber-glow/30 bg-[#16120e] p-5 shadow-2xl">
        <h2 id="circular-crop-title" className="font-display text-xl text-amber-glow">
          圓形裁切
        </h2>
        <p className="mt-1 text-sm text-white/50">
          拖曳調整位置，滾輪或滑桿放大縮小，圓內才會上傳。
        </p>

        <div
          ref={viewRef}
          className="relative mx-auto mt-4 touch-none overflow-hidden rounded-lg border border-white/10 bg-black/40"
          style={{ width: CIRCULAR_CROP_VIEW_SIZE, height: CIRCULAR_CROP_VIEW_SIZE, maxWidth: '100%' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {img && (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: displayW,
                height: displayH,
                left: CIRCULAR_CROP_VIEW_SIZE / 2 + offset.x - displayW / 2,
                top: CIRCULAR_CROP_VIEW_SIZE / 2 + offset.y - displayH / 2,
              }}
            />
          )}
          {/* 圓外遮罩 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle closest-side, transparent 69.5%, rgba(0,0,0,0.72) 70%)',
            }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 border-amber-glow/70"
            style={{
              width: CIRCULAR_CROP_VIEW_SIZE * 0.98,
              height: CIRCULAR_CROP_VIEW_SIZE * 0.98,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 1px rgba(255,236,196,0.25)',
            }}
          />
          {!img && !loadError && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
              載入中…
            </p>
          )}
        </div>

        <label className="mt-4 block text-sm text-white/60">
          縮放 {zoom.toFixed(2)}×
          <input
            type="range"
            min={CIRCULAR_CROP_ZOOM_MIN}
            max={CIRCULAR_CROP_ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full accent-amber-glow"
          />
        </label>

        {loadError && (
          <p className="mt-2 text-sm text-red-300/90" role="alert">
            {loadError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={exporting}
            className="flex-1 rounded border border-white/15 px-4 py-2.5 text-sm text-white/65 hover:border-white/30"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!img || exporting}
            className="flex-1 rounded border border-amber-glow/45 bg-amber-glow/15 px-4 py-2.5 text-sm text-amber-glow disabled:opacity-40"
          >
            {exporting ? '裁切中…' : '使用此圓形'}
          </button>
        </div>
      </div>
    </div>
  )
}
