import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { productGalleryThumbAlt } from '../../lib/imageAlt'
import { WatermarkedImageDownloadButton } from './WatermarkedImageDownloadButton'

export interface GalleryEditorItem {
  key: string
  previewSrc: string
  isNew?: boolean
}

interface AdminProductGalleryEditorProps {
  items: GalleryEditorItem[]
  onMove: (index: number, direction: 'up' | 'down') => void
  onRemove: (index: number) => void
  onReplace: (index: number, file: File) => void
  onDownload: (index: number) => Promise<void>
  onAppendFiles: (files: File[]) => void
  appendLabel?: string
  productName?: string
}

/** 後台商品相簿：追加、單張更換、排序、移除 */
export function AdminProductGalleryEditor({
  items,
  onMove,
  onRemove,
  onReplace,
  onDownload,
  onAppendFiles,
  appendLabel = '追加相簿照片',
  productName = '商品',
}: AdminProductGalleryEditorProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceIndexRef = useRef<number | null>(null)

  const handleAppendChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length > 0) onAppendFiles(files)
  }

  const openReplacePicker = (index: number) => {
    replaceIndexRef.current = index
    replaceInputRef.current?.click()
  }

  const handleReplaceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const index = replaceIndexRef.current
    replaceIndexRef.current = null
    if (file && index !== null) onReplace(index, file)
  }

  return (
    <div className="space-y-3">
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceChange}
      />

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2"
            >
              <span className="w-6 shrink-0 text-center text-xs text-white/40">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => openReplacePicker(index)}
                className="group relative shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow/60"
                title="點擊更換此張照片"
              >
                <img
                  src={item.previewSrc}
                  alt={productGalleryThumbAlt(productName, index, index === 0)}
                  className={`h-16 w-16 rounded object-cover transition group-hover:opacity-80 ${
                    item.isNew ? 'ring-2 ring-amber-glow/50' : ''
                  }`}
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-void/50 text-sm font-medium tracking-wide text-white/95 opacity-0 transition group-hover:opacity-100">
                  更換
                </span>
              </button>
              <div className="min-w-0 flex-1">
                {item.isNew ? (
                  <span className="text-sm tracking-wide text-amber-glow/80">
                    待上傳
                  </span>
                ) : (
                  <span className="text-sm text-white/55">點縮圖可更換</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <WatermarkedImageDownloadButton
                  compact
                  label="下載浮水印圖"
                  onDownload={() => onDownload(index)}
                />
                <button
                  type="button"
                  onClick={() => onMove(index, 'up')}
                  disabled={index === 0}
                  className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-30"
                  aria-label="上移"
                >
                  <ChevronUp className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 'down')}
                  disabled={index === items.length - 1}
                  className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-30"
                  aria-label="下移"
                >
                  <ChevronDown className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="flex h-8 w-8 items-center justify-center rounded border border-red-400/30 text-red-400/90 transition hover:bg-red-500/10"
                  aria-label="移除"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 py-6 transition hover:border-amber-glow/40">
        <span className="text-sm text-white/40">{appendLabel}</span>
        <span className="mt-1 text-xs text-white/40">
          可多次選擇；點縮圖可單張更換；順序即詳情頁切換順序
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAppendChange}
        />
      </label>
    </div>
  )
}
