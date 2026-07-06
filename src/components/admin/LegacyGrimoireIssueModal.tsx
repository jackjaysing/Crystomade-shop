import { useEffect, useState } from 'react'
import {
  adminIssueLegacyGrimoireOrders,
  type AdminLegacyGrimoireIssueRow,
} from '../../lib/api/adminGrimoire'
import { fetchProducts } from '../../lib/api/products'
import { formatPhoneDisplay } from '../../lib/api/adminCustomers'
import type { AdminRegisteredCustomer, Product } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface LegacyGrimoireIssueModalProps {
  member: AdminRegisteredCustomer
  onClose: () => void
  onIssued: (rows: AdminLegacyGrimoireIssueRow[]) => void
}

/** 後台：補登官網前購買紀錄並發行魔導書 */
export function LegacyGrimoireIssueModal({
  member,
  onClose,
  onIssued,
}: LegacyGrimoireIssueModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [productName, setProductName] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingProducts(true)
      try {
        const list = await fetchProducts({ bypassCache: true })
        if (!cancelled) setProducts(list)
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedProduct = productId
    ? products.find((item) => item.id === productId) ?? null
    : null

  const handleProductChange = (id: string) => {
    setProductId(id)
    const product = products.find((item) => item.id === id)
    if (product) {
      setProductName(product.name)
    }
  }

  const handleSubmit = async () => {
    const name = productName.trim() || selectedProduct?.name || ''
    if (!name) {
      setMessage('請填寫商品名稱或選擇商品')
      return
    }

    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
      setMessage('件數請填 1～20')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const rows = await adminIssueLegacyGrimoireOrders({
        userId: member.id,
        productId: productId || null,
        productName: name,
        productImageUrl: selectedProduct?.image_url ?? null,
        selectedSize: selectedSize.trim() || null,
        quantity: qty,
        note: note.trim() || undefined,
      })
      onIssued(rows)
      onClose()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '補登失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-lg p-6 sm:p-8">
        <h3 className="font-display text-xl text-white">補登魔導書</h3>
        <p className="mt-1 text-sm text-white/50">
          {member.real_name} · {formatPhoneDisplay(member.phone)}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          用於官網上線前已購買、系統無訂單紀錄的會員。會建立 LEG- 歷史訂單並發行靈魂卡，不扣庫存、不發點數。
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">
              對應商品（選填）
            </label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={loadingProducts || submitting}
              className="admin-select"
            >
              <option value="">不指定商品／手動填名稱</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.generates_soul_card === false ? '（不發魔導書）' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">商品名稱 *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={submitting}
              placeholder="例：粉晶手串"
              className="input-field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/50">件數 *</label>
              <input
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === '' || /^\d+$/.test(next)) setQuantity(next)
                }}
                disabled={submitting}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">尺寸（選填）</label>
              <input
                type="text"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                disabled={submitting}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">備註（選填）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              placeholder="例：2024 市集購入"
              className="input-field"
            />
          </div>
        </div>

        {message && (
          <p className="mt-4 text-sm text-amber-glow/90" role="status">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-lg border border-amber-glow/40 bg-amber-glow/10 px-4 py-2 text-sm text-amber-glow transition hover:bg-amber-glow/20 disabled:opacity-50"
          >
            {submitting ? '處理中…' : '建立並發卡'}
          </button>
        </div>
      </GlassPanel>
    </div>
  )
}
