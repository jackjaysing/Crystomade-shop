import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eraser, GripVertical, Search, Trash2 } from 'lucide-react'
import { FIVE_ELEMENTS, type FiveElement } from '../../constants/fiveElements'
import {
  BEAD_SIZE_DISPLAY_PX,
  BEAD_SIZE_LABELS,
  type BeadSizeCategory,
} from '../../constants/beadSizes'
import { beadMatchesCrystalColorId } from '../../constants/crystalColors'
import { EFFICACY_TAGS } from '../../constants/tags'
import { useCart } from '../../contexts/CartContext'
import { fetchActiveBraceletBeads, type BraceletBead } from '../../lib/api/beads'
import { fetchBraceletShopSettings } from '../../lib/api/braceletShopSettings'
import {
  assessBraceletFit,
  computeBraceletBalance,
  formatBeadElements,
  formatBeadSizeLabel,
  suggestedBeadCount,
  type BraceletConfig,
  type BraceletConfigBead,
} from '../../lib/braceletConfig'
import { formatErrorMessage } from '../../lib/formatError'
import { getProductSalePrice } from '../../lib/productPricing'
import { isProductSoldOut } from '../../lib/productStock'
import { productDetailPath } from '../../lib/productSlug'
import type { Product } from '../../lib/types'
import { BraceletSizePicker } from '../products/BraceletSizePicker'
import { CrystalColorFilter } from '../products/CrystalColorFilter'
import { ProductPriceDisplay } from '../products/ProductPriceDisplay'
import { GlassPanel } from '../ui/GlassPanel'
import { BeadsFitAdjustNotice } from './BeadsFitAdjustNotice'
import { BeadsRestockingNotice } from './BeadsRestockingNotice'
import { BeadThumb } from './BeadThumb'
import { BraceletBeadPreview } from './BraceletBeadPreview'

interface BraceletBuilderViewProps {
  product: Product
}

function toConfigBead(bead: BraceletBead, size: BeadSizeCategory): BraceletConfigBead {
  return {
    bead_id: bead.id,
    name: bead.name,
    elements: [...bead.elements],
    size,
    efficacy_tags: bead.efficacy_tags,
    image_url: bead.image_url,
  }
}

/** 客戶五行平衡手串配置器 */
export function BraceletBuilderView({ product }: BraceletBuilderViewProps) {
  const navigate = useNavigate()
  const { addItem, openCart } = useCart()
  const [catalog, setCatalog] = useState<BraceletBead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [wristSize, setWristSize] = useState<string | null>(null)
  const [goalElements, setGoalElements] = useState<FiveElement[]>([])
  const [goalEfficacy, setGoalEfficacy] = useState<string[]>([])
  const [selected, setSelected] = useState<BraceletConfigBead[]>([])
  const [filterElement, setFilterElement] = useState<FiveElement | '全部'>('全部')
  const [filterColorId, setFilterColorId] = useState<string | null>(null)
  const [filterEfficacy, setFilterEfficacy] = useState<string | '全部'>('全部')
  const [beadSearch, setBeadSearch] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [requestOfficialReview, setRequestOfficialReview] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [beadsRestocking, setBeadsRestocking] = useState(false)
  const dragFromRef = useRef<number | null>(null)
  /** 加珠時鎖住視窗捲動，並把珠序列表捲到最新一顆 */
  const lockScrollYRef = useRef<number | null>(null)
  const selectedListRef = useRef<HTMLDivElement>(null)

  const soldOut = isProductSoldOut(product)
  const beadHint = suggestedBeadCount(wristSize)

  useLayoutEffect(() => {
    const y = lockScrollYRef.current
    if (y == null) return
    lockScrollYRef.current = null
    const root = document.scrollingElement ?? document.documentElement
    root.scrollTop = y
    window.scrollTo({ top: y, left: 0, behavior: 'auto' })
    const list = selectedListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [selected])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([fetchActiveBraceletBeads(), fetchBraceletShopSettings()])
      .then(([rows, settings]) => {
        if (cancelled) return
        setCatalog(rows)
        setBeadsRestocking(settings.beads_restocking)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(formatErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredCatalog = useMemo(() => {
    const q = beadSearch.trim().toLowerCase()
    return catalog.filter((b) => {
      if (filterElement !== '全部' && !b.elements.includes(filterElement)) return false
      if (!beadMatchesCrystalColorId(b, filterColorId)) return false
      if (filterEfficacy !== '全部' && !b.efficacy_tags.includes(filterEfficacy)) return false
      if (q && !b.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [catalog, filterElement, filterColorId, filterEfficacy, beadSearch])

  const balance = useMemo(
    () =>
      computeBraceletBalance({
        goals: { elements: goalElements, efficacy: goalEfficacy },
        beads: selected,
      }),
    [goalElements, goalEfficacy, selected]
  )

  const fit = useMemo(
    () => assessBraceletFit(wristSize, selected),
    [wristSize, selected]
  )

  const toggleGoalElement = (el: FiveElement) => {
    setGoalElements((prev) =>
      prev.includes(el) ? prev.filter((x) => x !== el) : [...prev, el]
    )
  }

  const toggleGoalEfficacy = (tag: string) => {
    setGoalEfficacy((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    )
  }

  const addBead = (bead: BraceletBead, size: BeadSizeCategory) => {
    const root = document.scrollingElement ?? document.documentElement
    lockScrollYRef.current = root.scrollTop
    setSelected((prev) => [...prev, toConfigBead(bead, size)])
  }

  const removeAt = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index))
  }

  const duplicateAt = (index: number) => {
    setSelected((prev) => {
      const bead = prev[index]
      if (!bead) return prev
      const next = [...prev]
      next.splice(index + 1, 0, { ...bead, elements: [...bead.elements], efficacy_tags: [...bead.efficacy_tags] })
      return next
    })
  }

  const clearSelected = () => {
    setSelected([])
    setDraggingIndex(null)
    dragFromRef.current = null
  }

  const moveBead = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return
    setSelected((prev) => {
      if (from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const findListIndexFromPoint = (clientX: number, clientY: number): number | null => {
    const el = document.elementFromPoint(clientX, clientY)
    if (!el) return null
    const row = el.closest('[data-bead-index]')
    if (!row) return null
    const raw = row.getAttribute('data-bead-index')
    if (raw == null) return null
    const index = Number(raw)
    return Number.isFinite(index) ? index : null
  }

  const onDragHandlePointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragFromRef.current = index
    setDraggingIndex(index)
  }

  const onDragHandlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragFromRef.current == null) return
    const over = findListIndexFromPoint(e.clientX, e.clientY)
    if (over == null || over === dragFromRef.current) return
    const from = dragFromRef.current
    moveBead(from, over)
    dragFromRef.current = over
    setDraggingIndex(over)
  }

  const onDragHandlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragFromRef.current = null
    setDraggingIndex(null)
  }

  const handleAddToCart = (goCheckout: boolean) => {
    if (soldOut) return
    if (!wristSize) {
      setSizeError('請先選擇淨手圍')
      return
    }
    if (selected.length === 0) {
      setFeedback('請至少加入一顆珠材')
      return
    }
    setSizeError(null)
    const config: BraceletConfig = {
      wrist_size: wristSize,
      mode: 'self',
      request_official_review: requestOfficialReview,
      goals: { elements: goalElements, efficacy: goalEfficacy },
      beads: selected,
    }
    addItem(product, {
      quantity: 1,
      selectedSize: wristSize,
      braceletConfig: config,
    })
    if (goCheckout) {
      navigate('/checkout')
      return
    }
    openCart()
    setFeedback('已加入購物車')
    window.setTimeout(() => setFeedback(null), 2200)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-5xl min-w-0 overflow-x-clip px-4 sm:px-6">
        <Link
          to={productDetailPath(product)}
          className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-amber-glow"
        >
          <ArrowLeft className="h-4 w-4" />
          返回商品頁
        </Link>

        <GlassPanel className="mt-4 p-5 sm:p-8">
          <p className="text-xs tracking-[0.25em] text-amber-glow/70">BRACELET BUILDER</p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            自行配珠
          </h1>
          <p className="mt-2 text-sm text-white/55">
            {product.name} · 固定售價 · 出貨時由晶刻依序評估水晶等級並串製
          </p>
          <div className="mt-3">
            <ProductPriceDisplay product={product} variant="detail" />
          </div>

          <div className="mt-5 rounded-lg border border-amber-glow/30 bg-amber-glow/5 p-4">
            <p className="text-base font-medium text-amber-glow">五行僅供參考</p>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              此頁的五行與功效提示為規則型參考，非個人命盤精準配置。若需要更準確，可返回商品頁改選「官方配珠」，或在下方勾選請官方協助確認你的配置。
            </p>
            <Link
              to={productDetailPath(product)}
              className="mt-3 inline-block text-sm text-amber-glow/90 underline-offset-2 hover:underline"
            >
              改選官方配珠
            </Link>
          </div>

          {beadsRestocking && <BeadsRestockingNotice className="mt-4" />}

          <BeadsFitAdjustNotice className="mt-4" />

          {soldOut && (
            <p className="mt-4 text-sm text-white/40">此商品目前無法下單，僅供預覽配置。</p>
          )}

          <section className="mt-8 space-y-3">
            <h2 className="text-sm tracking-wider text-amber-glow/80">1. 淨手圍</h2>
            <BraceletSizePicker
              value={wristSize}
              onChange={(size) => {
                setWristSize(size)
                setSizeError(null)
              }}
            />
            {sizeError && <p className="text-xs text-red-300/90">{sizeError}</p>}
            <p className="text-xs text-white/40">
              參考珠數（純 8mm）：{beadHint.label}
            </p>
            {selected.length > 0 && (
              <p
                className={`text-xs ${
                  fit.status === 'short' || fit.status === 'long'
                    ? 'text-amber-200/90'
                    : fit.status === 'ok'
                      ? 'text-emerald-300/80'
                      : 'text-white/45'
                }`}
              >
                依目前咪數：{fit.headline}
              </p>
            )}
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-sm tracking-wider text-amber-glow/80">
              2. 想加強的五行（僅供參考，可不選）
            </h2>
            <div className="flex flex-wrap gap-2">
              {FIVE_ELEMENTS.map((el) => {
                const on = goalElements.includes(el)
                return (
                  <button
                    key={el}
                    type="button"
                    onClick={() => toggleGoalElement(el)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      on
                        ? 'border-amber-glow/60 bg-amber-glow/20 text-amber-glow'
                        : 'border-white/15 text-white/55 hover:border-amber-glow/35'
                    }`}
                  >
                    {el}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <h2 className="text-sm tracking-wider text-amber-glow/80">
              3. 想加強的功效（僅供參考，可不選）
            </h2>
            <div className="flex flex-wrap gap-2">
              {EFFICACY_TAGS.map((tag) => {
                const on = goalEfficacy.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleGoalEfficacy(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      on
                        ? 'border-violet-400/50 bg-violet-400/15 text-violet-200'
                        : 'border-white/15 text-white/55 hover:border-violet-400/30'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="mt-8 grid min-w-0 gap-6 lg:grid-cols-2 [overflow-anchor:none]">
            <div className="min-w-0 max-w-full [overflow-anchor:none]">
              <h2 className="text-sm tracking-wider text-amber-glow/80">
                4. 預覽與平衡提示（僅供參考）
              </h2>
              <div className="mt-3 min-w-0 max-w-full">
                <BraceletBeadPreview
                  beads={selected}
                  onReorder={(next) => setSelected(next)}
                  onRemoveAt={removeAt}
                  onDuplicateAt={duplicateAt}
                  onClear={clearSelected}
                />
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
                <p className="text-xs tracking-wider text-white/45">
                  手圍合身估算 · 依顆數＋咪數
                </p>
                <p
                  className={`mt-1 text-base ${
                    fit.status === 'short' || fit.status === 'long'
                      ? 'text-amber-200'
                      : fit.status === 'ok'
                        ? 'text-emerald-300'
                        : 'text-amber-glow'
                  }`}
                >
                  {fit.headline}
                </p>
                <p className="mt-1 text-sm text-white/55">{fit.detail}</p>
                {(fit.suggestAdd > 0 || fit.suggestRemove > 0) && (
                  <p className="mt-2 text-sm text-white/70">
                    {fit.suggestAdd > 0
                      ? `建議新增約 ${fit.suggestAdd} 顆（或改選較大咪數）`
                      : `建議減少約 ${fit.suggestRemove} 顆（或改選較小咪數）`}
                  </p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-white/45">
                  最終串製時，晶刻會依手圍適當增減水晶或補隔珠，以確保佩戴合手。
                </p>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
                <p className="text-xs tracking-wider text-white/45">
                  參考提示 · 非命盤精算
                </p>
                <p className="mt-1 text-base text-amber-glow">{balance.headline}</p>
                <p className="mt-1 text-sm text-white/55">
                  目前 {balance.total} 珠
                  {wristSize ? ` · 8mm 參考 ${beadHint.min}–${beadHint.max} 顆` : ''}
                </p>
                <ul className="mt-3 grid grid-cols-5 gap-2 text-center text-sm">
                  {balance.rows.map((row) => (
                    <li key={row.element}>
                      <p
                        className={
                          row.status === 'weak'
                            ? 'text-rose-300'
                            : row.status === 'strong'
                              ? 'text-amber-200'
                              : 'text-white/70'
                        }
                      >
                        {row.element}
                      </p>
                      <p className="text-white/45">{row.count}</p>
                    </li>
                  ))}
                </ul>
                {(balance.efficacyMatched.length > 0 ||
                  balance.efficacyMissing.length > 0) && (
                  <div className="mt-3 space-y-1.5 text-sm">
                    {balance.efficacyMatched.length > 0 && (
                      <p className="text-emerald-300/90">
                        已覆蓋：{balance.efficacyMatched.join('、')}
                      </p>
                    )}
                    {balance.efficacyMissing.length > 0 && (
                      <p className="text-rose-300/90">
                        尚未覆蓋：{balance.efficacyMissing.join('、')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 max-w-full flex-col [overflow-anchor:none]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm tracking-wider text-amber-glow/80">
                  已選珠序（串製順序）
                  {selected.length > 0 ? (
                    <span className="ml-2 font-sans text-xs tracking-normal text-white/40">
                      {selected.length} 顆
                    </span>
                  ) : null}
                </h2>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-xs text-white/55 transition hover:border-rose-300/40 hover:text-rose-200"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    清除全部
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-white/45">
                點選圓盤珠子後出現＋／－；拖曳或列表握把可調順序
              </p>
              {/* 固定高度：加珠只在框內捲動，不撐高整頁 */}
              <div
                ref={selectedListRef}
                className="mt-3 h-[280px] overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-black/20 p-2 [overflow-anchor:none]"
              >
                {selected.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-white/40">
                    尚未選珠
                  </p>
                ) : (
                  <ol className="space-y-2 pr-0.5">
                    {selected.map((bead, index) => {
                      const px = BEAD_SIZE_DISPLAY_PX[bead.size] ?? 40
                      const isDragging = draggingIndex === index
                      return (
                        <li
                          key={`${bead.bead_id}-${bead.size}-${index}`}
                          data-bead-index={index}
                          className={`flex items-center gap-2 rounded border p-2 transition ${
                            isDragging
                              ? 'border-amber-glow/50 bg-amber-glow/10 opacity-90 shadow-lg'
                              : 'border-white/10 bg-black/25'
                          }`}
                        >
                          <button
                            type="button"
                            aria-label={`拖曳調整第 ${index + 1} 顆順序`}
                            onPointerDown={(e) => onDragHandlePointerDown(e, index)}
                            onPointerMove={onDragHandlePointerMove}
                            onPointerUp={onDragHandlePointerUp}
                            onPointerCancel={onDragHandlePointerUp}
                            className="touch-none cursor-grab rounded border border-white/10 p-1.5 text-white/50 active:cursor-grabbing hover:border-amber-glow/40 hover:text-amber-glow"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <span className="w-6 shrink-0 text-center text-xs text-white/35">
                            {index + 1}
                          </span>
                          <BeadThumb
                            imageUrl={bead.image_url}
                            name={bead.name}
                            elements={bead.elements}
                            sizePx={Math.min(px, 44)}
                            className="pointer-events-none"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white">{bead.name}</p>
                            <p className="text-[11px] text-white/40">
                              {formatBeadElements(bead.elements)}
                              {' · '}
                              {formatBeadSizeLabel(bead.size)}
                              {bead.efficacy_tags.length > 0
                                ? ` · ${bead.efficacy_tags.join('、')}`
                                : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label="移除"
                            onClick={() => removeAt(index)}
                            className="shrink-0 rounded border border-white/10 p-1.5 text-white/50 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-sm tracking-wider text-amber-glow/80">5. 選擇珠材加入</h2>

            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                value={beadSearch}
                onChange={(e) => setBeadSearch(e.target.value)}
                placeholder="搜尋珠材名稱…"
                className="w-full rounded-lg border border-white/15 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/35"
              />
            </label>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1.5 text-xs text-white/40">五行</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterElement('全部')}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      filterElement === '全部'
                        ? 'border-amber-glow/50 text-amber-glow'
                        : 'border-white/15 text-white/45'
                    }`}
                  >
                    全部
                  </button>
                  {FIVE_ELEMENTS.map((el) => (
                    <button
                      key={el}
                      type="button"
                      onClick={() => setFilterElement(el)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        filterElement === el
                          ? 'border-amber-glow/50 text-amber-glow'
                          : 'border-white/15 text-white/45'
                      }`}
                    >
                      {el}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs text-white/40">顏色</p>
                <div className="overflow-x-auto pb-1">
                  <CrystalColorFilter
                    activeColorId={filterColorId}
                    onSelect={setFilterColorId}
                  />
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs text-white/40">功效</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterEfficacy('全部')}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      filterEfficacy === '全部'
                        ? 'border-violet-400/50 text-violet-200'
                        : 'border-white/15 text-white/45'
                    }`}
                  >
                    全部
                  </button>
                  {EFFICACY_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFilterEfficacy(tag)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        filterEfficacy === tag
                          ? 'border-violet-400/50 text-violet-200'
                          : 'border-white/15 text-white/45'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-white/40">載入珠材中…</p>
            ) : loadError ? (
              <p className="mt-4 text-sm text-red-300/80">{loadError}</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">
                {catalog.length === 0
                  ? '尚無可選珠材，請稍後再試或聯絡晶刻。'
                  : '沒有符合篩選／搜尋的珠材，請調整條件。'}
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filteredCatalog.map((bead) => {
                  const previewSize = bead.sizes[0] ?? '7-9'
                  const px = BEAD_SIZE_DISPLAY_PX[previewSize]
                  return (
                    <li
                      key={bead.id}
                      className="rounded-lg border border-white/10 bg-black/25 p-3"
                    >
                      {bead.image_url || bead.elements ? (
                        <div className="mx-auto w-fit">
                          <BeadThumb
                            imageUrl={bead.image_url}
                            name={bead.name}
                            elements={bead.elements}
                            sizePx={Math.max(36, px)}
                          />
                        </div>
                      ) : null}
                      <p className="mt-2 truncate text-center text-sm text-white">
                        {bead.name}
                      </p>
                      <p className="mt-0.5 text-center text-xs text-white/40">
                        {formatBeadElements(bead.elements)}
                        {bead.efficacy_tags[0] ? ` · ${bead.efficacy_tags[0]}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {bead.sizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addBead(bead, size)}
                            className="rounded-full border border-amber-glow/35 bg-amber-glow/10 px-2.5 py-1 text-xs text-amber-glow transition hover:bg-amber-glow/20"
                          >
                            加入 {BEAD_SIZE_LABELS[size]}
                          </button>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {feedback && (
            <p className="mt-6 text-sm text-emerald-400" role="status">
              {feedback}
            </p>
          )}

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-violet-400/25 bg-violet-400/5 p-4 text-base text-white/75">
            <input
              type="checkbox"
              checked={requestOfficialReview}
              onChange={(e) => setRequestOfficialReview(e.target.checked)}
              className="mt-1 h-4 w-4 accent-violet-300"
            />
            <span>
              <span className="block text-base text-violet-100">
                下單後請官方協助確認配置是否準確
              </span>
              <span className="mt-1.5 block text-sm leading-relaxed text-white/50">
                勾選後，晶刻會在串製前檢視你的珠序與目標，必要時可與你溝通調整（五行仍僅供參考）
              </span>
            </span>
          </label>

          {!soldOut && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleAddToCart(false)}
                className="flex-1 rounded-lg border border-amber-glow/50 bg-amber-glow/10 py-4 text-sm tracking-[0.15em] text-amber-glow transition hover:bg-amber-glow/20"
              >
                加入購物車 · NT$ {getProductSalePrice(product)}
              </button>
              <button
                type="button"
                onClick={() => handleAddToCart(true)}
                className="flex-1 rounded-lg bg-amber-glow/90 py-4 text-sm font-medium tracking-[0.15em] text-void transition hover:bg-amber-glow"
              >
                立即結帳
              </button>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
