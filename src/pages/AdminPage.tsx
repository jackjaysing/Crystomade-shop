import { useEffect, useState } from 'react'
import { AdminLogin } from '../components/admin/AdminLogin'
import { DeletedProductsModal } from '../components/admin/DeletedProductsModal'
import { OrderTable } from '../components/admin/OrderTable'
import { ProductForm } from '../components/admin/ProductForm'
import { ProductListAdmin } from '../components/admin/ProductListAdmin'
import { useOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { isAdminAuthenticated, logoutAdmin } from '../lib/adminAuth'
import { Archive } from 'lucide-react'

/** 賣家後台管理頁 */
export function AdminPage() {
  const [authed, setAuthed] = useState(isAdminAuthenticated)
  const [showDeleted, setShowDeleted] = useState(false)
  const { products, reload: reloadProducts } = useProducts()
  const { orders, loading: ordersLoading, reload: reloadOrders } = useOrders(authed)

  useEffect(() => {
    setAuthed(isAdminAuthenticated())
  }, [])

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-28">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-amber-glow">晶刻 · 管理後台</h1>
          <p className="mt-1 text-sm text-white/50">Crystomade · 訂單與商品管理</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logoutAdmin()
            setAuthed(false)
          }}
          className="text-sm text-white/40 hover:text-white/70"
        >
          登出
        </button>
      </div>

      {/* 功能一：訂單明細 */}
      <section className="mb-16">
        <h2 className="mb-4 text-lg tracking-wide text-white/80">訂單明細</h2>
        <OrderTable
          orders={orders}
          loading={ordersLoading}
          onUpdated={reloadOrders}
        />
      </section>

      {/* 功能二：商品管理 */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg tracking-wide text-white/80">商品管理</h2>
          <button
            type="button"
            onClick={() => setShowDeleted(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow"
          >
            <Archive className="h-4 w-4" strokeWidth={1.5} />
            已刪除物品
          </button>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <ProductForm onCreated={reloadProducts} />
          <ProductListAdmin products={products} onUpdated={reloadProducts} />
        </div>
      </section>

      {showDeleted && (
        <DeletedProductsModal
          onClose={() => setShowDeleted(false)}
          onRestored={reloadProducts}
        />
      )}
    </div>
  )
}
