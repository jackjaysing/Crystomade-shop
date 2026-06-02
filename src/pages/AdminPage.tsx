import { useEffect, useState } from 'react'
import { AdminLogin } from '../components/admin/AdminLogin'
import { BannerAdmin } from '../components/admin/BannerAdmin'
import { DeletedProductsModal } from '../components/admin/DeletedProductsModal'
import { PageViewStats } from '../components/admin/PageViewStats'
import { OrderTable } from '../components/admin/OrderTable'
import { ProductForm } from '../components/admin/ProductForm'
import { ProductListAdmin } from '../components/admin/ProductListAdmin'
import { useOrders } from '../hooks/useOrders'
import { useBanners } from '../hooks/useBanners'
import { usePageViewStats } from '../hooks/usePageViewStats'
import { useProductViewStats } from '../hooks/useProductViewStats'
import { useProducts } from '../hooks/useProducts'
import { isAdminAuthenticated, logoutAdmin } from '../lib/adminAuth'
import { ScrollToTopFab } from '../components/ui/ScrollToTopFab'
import { Archive } from 'lucide-react'

type AdminTab = 'products' | 'orders' | 'banners' | 'analytics'

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'products', label: '商品管理' },
  { id: 'orders', label: '訂單明細' },
  { id: 'banners', label: '公告橫幅' },
  { id: 'analytics', label: '瀏覽統計' },
]

/** 賣家後台管理頁 */
export function AdminPage() {
  const [authed, setAuthed] = useState(isAdminAuthenticated)
  const [activeTab, setActiveTab] = useState<AdminTab>('products')
  const [showDeleted, setShowDeleted] = useState(false)
  const { products, reload: reloadProducts } = useProducts()
  const { orders, loading: ordersLoading, reload: reloadOrders } = useOrders(authed)
  const {
    stats: pageViewStats,
    loading: pageViewLoading,
    error: pageViewError,
    reload: reloadPageViewStats,
  } = usePageViewStats(authed)
  const {
    statsByProductId,
    error: productViewError,
    reload: reloadProductViewStats,
  } = useProductViewStats(authed)
  const {
    banners,
    error: bannerError,
    reload: reloadBanners,
  } = useBanners({ admin: true, enabled: authed })

  const reloadAnalytics = () => {
    reloadPageViewStats()
    reloadProductViewStats()
  }

  useEffect(() => {
    setAuthed(isAdminAuthenticated())
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab])

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
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

      <nav
        className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4"
        aria-label="後台功能分頁"
      >
        {ADMIN_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-2 text-sm tracking-wide transition ${
                isActive
                  ? 'border-amber-glow/60 bg-amber-glow/15 text-amber-glow'
                  : 'border-white/15 text-white/55 hover:border-amber-glow/40 hover:text-amber-glow'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      <div role="tabpanel">
        {activeTab === 'products' && (
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
              <ProductListAdmin
                products={products}
                viewStatsByProductId={statsByProductId}
                viewStatsError={productViewError}
                onUpdated={() => {
                  reloadProducts()
                  reloadProductViewStats()
                }}
              />
            </div>
          </section>
        )}

        {activeTab === 'orders' && (
          <section>
            <h2 className="mb-4 text-lg tracking-wide text-white/80">訂單明細</h2>
            <OrderTable
              orders={orders}
              loading={ordersLoading}
              onUpdated={reloadOrders}
            />
          </section>
        )}

        {activeTab === 'banners' && (
          <section>
            <h2 className="mb-4 text-lg tracking-wide text-white/80">公告橫幅</h2>
            {bannerError && (
              <p className="mb-3 text-sm text-amber-glow/90">
                無法載入橫幅：{bannerError}（請執行
                migration-add-announcement-banners.sql）
              </p>
            )}
            <BannerAdmin banners={banners} onUpdated={reloadBanners} />
          </section>
        )}

        {activeTab === 'analytics' && (
          <PageViewStats
            stats={pageViewStats}
            loading={pageViewLoading}
            error={pageViewError}
            onReload={reloadAnalytics}
          />
        )}
      </div>

      <ScrollToTopFab ariaLabel="回到後台頂部" title="回到後台頂部" />

      {showDeleted && (
        <DeletedProductsModal
          onClose={() => setShowDeleted(false)}
          onRestored={reloadProducts}
        />
      )}
    </div>
  )
}
