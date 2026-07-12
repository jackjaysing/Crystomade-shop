import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Eraser, Minus, Plus } from 'lucide-react'
import {
  BEAD_SIZE_DISPLAY_PX,
  BEAD_SIZE_RING_PX,
  resolveBeadDisplaySize,
} from '../../constants/beadSizes'
import {
  formatBeadElements,
  formatBeadSizeLabel,
  type BraceletConfigBead,
} from '../../lib/braceletConfig'
import { BeadThumb } from './BeadThumb'

interface BraceletBeadPreviewProps {
  beads: BraceletConfigBead[]
  onReorder?: (next: BraceletConfigBead[]) => void
  onRemoveAt?: (index: number) => void
  onDuplicateAt?: (index: number) => void
  onClear?: () => void
  /** 是否顯示上方橫排預覽；後台可關閉，改由依序串製區承接 */
  showStrip?: boolean
}

const DRAG_THRESHOLD_PX = 8

function angleToIndex(clientX: number, clientY: number, rect: DOMRect, count: number): number {
  if (count <= 0) return 0
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = clientX - cx
  const dy = clientY - cy
  let t = (Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI * 2)
  if (t < 0) t += 1
  return Math.round(t * count) % count
}

function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list
  }
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function isNearRing(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  radius: number,
  maxBead: number
): boolean {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dist = Math.hypot(clientX - cx, clientY - cy)
  return dist >= radius - maxBead && dist <= radius + maxBead
}

/** 2D 橫排／環狀珠串預覽；點選後顯示 +/-，可拖曳調序 */
export function BraceletBeadPreview({
  beads,
  onReorder,
  onRemoveAt,
  onDuplicateAt,
  onClear,
  showStrip = true,
}: BraceletBeadPreviewProps) {
  const ringRef = useRef<HTMLDivElement>(null)
  const dragFromRef = useRef<number | null>(null)
  const pointerStartRef = useRef<{ x: number; y: number; index: number | null } | null>(null)
  const didDragRef = useRef(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const canDrag = Boolean(onReorder) && beads.length > 1
  const canEdit = Boolean(onRemoveAt || onDuplicateAt)
  /** 點選可辨識珠名（後台／前台皆可用） */
  const canSelect = true
  const radius = Math.min(130, 52 + beads.length * 4)

  useEffect(() => {
    if (selectedIndex == null) return
    if (beads.length === 0) {
      setSelectedIndex(null)
      return
    }
    if (selectedIndex >= beads.length) setSelectedIndex(beads.length - 1)
  }, [beads.length, selectedIndex])

  const ring = useMemo(() => {
    if (beads.length === 0) return []
    return beads.map((bead, index) => {
      const angle = (index / beads.length) * Math.PI * 2 - Math.PI / 2
      const size = resolveBeadDisplaySize(bead.size)
      // 手機上過小會像黑點，圓盤至少 28px
      const px = Math.max(28, BEAD_SIZE_RING_PX[size])
      return {
        bead,
        index,
        px,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })
  }, [beads, radius])

  const maxBeadPx = Math.max(...ring.map((r) => r.px), 28)
  const selectedBead =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < beads.length
      ? beads[selectedIndex]
      : null

  const onRingPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((!canDrag && !canSelect) || !ringRef.current) return
    if ((e.target as HTMLElement).closest('button')) return

    const rect = ringRef.current.getBoundingClientRect()
    const near = isNearRing(e.clientX, e.clientY, rect, radius, maxBeadPx)
    const index = near ? angleToIndex(e.clientX, e.clientY, rect, beads.length) : null

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerStartRef.current = { x: e.clientX, y: e.clientY, index }
    dragFromRef.current = index
    didDragRef.current = false
    if (index != null) setDraggingIndex(index)
  }

  const onRingPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragFromRef.current == null || !pointerStartRef.current || !ringRef.current) return
    if (!canDrag || !onReorder) return

    const dx = e.clientX - pointerStartRef.current.x
    const dy = e.clientY - pointerStartRef.current.y
    if (!didDragRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    didDragRef.current = true

    const rect = ringRef.current.getBoundingClientRect()
    const over = angleToIndex(e.clientX, e.clientY, rect, beads.length)
    const from = dragFromRef.current
    if (over === from) return
    onReorder(reorderList(beads, from, over))
    dragFromRef.current = over
    setDraggingIndex(over)
    setSelectedIndex(over)
  }

  const onRingPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const start = pointerStartRef.current
    if (canSelect && start && !didDragRef.current) {
      if (start.index == null) {
        setSelectedIndex(null)
      } else {
        setSelectedIndex((prev) => (prev === start.index ? null : start.index))
      }
    }
    pointerStartRef.current = null
    dragFromRef.current = null
    didDragRef.current = false
    setDraggingIndex(null)
  }

  if (beads.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-amber-glow/25 bg-black/20 px-4 text-center text-sm text-white/40">
        點選下方珠材開始配置，此處會依咪數模擬真實樣貌
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showStrip && (
        <div className="overflow-x-auto rounded-xl border border-amber-glow/20 bg-gradient-to-br from-[#1a1410] via-[#221a12] to-[#100d09] p-4">
          <div className="flex min-w-max items-end gap-1.5">
            {beads.map((bead, index) => {
              const size = resolveBeadDisplaySize(bead.size)
              const px = BEAD_SIZE_DISPLAY_PX[size]
              const title = `${index + 1}. ${bead.name}（${formatBeadElements(bead.elements)} · ${formatBeadSizeLabel(size)}）`
              return (
                <div
                  key={`strip-${bead.bead_id}-${bead.size}-${index}`}
                  className="relative shrink-0"
                  title={title}
                >
                  <BeadThumb
                    imageUrl={bead.image_url}
                    name={bead.name}
                    elements={bead.elements}
                    sizePx={Math.max(28, px)}
                    className="shadow-[0_0_10px_rgba(201,168,76,0.2)]"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(canEdit || onClear) && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-amber-glow/80">
            {canEdit
              ? '點選珠子看名稱；可＋／－與拖曳調順序'
              : '點選圓盤上的珠子可查看名稱'}
          </p>
          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear()
                setSelectedIndex(null)
              }}
              className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-xs text-white/55 transition hover:border-rose-300/40 hover:text-rose-200"
            >
              <Eraser className="h-3.5 w-3.5" />
              清除全部
            </button>
          )}
        </div>
      )}

      {!canEdit && !onClear && showStrip && (
        <p className="px-1 text-xs text-amber-glow/80">點選圓盤上的珠子可查看名稱</p>
      )}

      <div
        ref={ringRef}
        className={`relative mx-auto h-[300px] w-full max-w-sm touch-none ${
          canSelect || canDrag ? 'cursor-pointer' : ''
        } ${canDrag ? 'active:cursor-grabbing' : ''}`}
        onPointerDown={onRingPointerDown}
        onPointerMove={onRingPointerMove}
        onPointerUp={onRingPointerUp}
        onPointerCancel={onRingPointerUp}
      >
        <div className="pointer-events-none absolute inset-0 rounded-full border border-amber-glow/15" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-glow/10" />
        {ring.map(({ bead, index, x, y, px }) => {
          const isDragging = draggingIndex === index
          const isSelected = selectedIndex === index
          return (
            <div
              key={`ring-${bead.bead_id}-${bead.size}-${index}`}
              className={`absolute left-1/2 top-1/2 z-[1] select-none ${
                isDragging || isSelected ? 'z-20 scale-110' : ''
              }`}
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
              title={`${index + 1}. ${bead.name}（${formatBeadSizeLabel(bead.size)}）`}
            >
              <div className="relative" style={{ width: px, height: px }}>
                <BeadThumb
                  imageUrl={bead.image_url}
                  name={bead.name}
                  elements={bead.elements}
                  sizePx={px}
                  emphasize={isSelected || isDragging}
                  className="pointer-events-none h-full w-full"
                />
                {isSelected && canEdit && (
                  <>
                    {onDuplicateAt && (
                      <button
                        type="button"
                        aria-label={`再加一顆 ${bead.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDuplicateAt(index)
                          setSelectedIndex(index + 1)
                        }}
                        className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-amber-glow/50 bg-[#1a1410] text-amber-glow shadow-md hover:bg-amber-glow/20"
                      >
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    )}
                    {onRemoveAt && (
                      <button
                        type="button"
                        aria-label={`刪除 ${bead.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveAt(index)
                          setSelectedIndex(null)
                        }}
                        className="absolute -bottom-1.5 -left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-rose-300/45 bg-[#1a1410] text-rose-200 shadow-md hover:bg-rose-400/15"
                      >
                        <Minus className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5] w-[58%] -translate-x-1/2 -translate-y-1/2 text-center">
          {selectedBead && selectedIndex != null ? (
            <div className="rounded-lg bg-black/75 px-2.5 py-2 shadow-lg backdrop-blur-sm">
              <p className="text-[11px] text-amber-glow/80">第 {selectedIndex + 1} 顆</p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-white">
                {selectedBead.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/55">
                {formatBeadElements(selectedBead.elements)}
                {' · '}
                {formatBeadSizeLabel(selectedBead.size)}
              </p>
            </div>
          ) : (
            <p className="text-sm tracking-wider text-amber-glow/70">{beads.length} 珠</p>
          )}
        </div>
      </div>
    </div>
  )
}
