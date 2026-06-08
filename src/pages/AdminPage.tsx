import { useEffect, useMemo, useRef, useState } from 'react'
import { AdminActivityLogPanel } from '../components/admin/AdminActivityLogPanel'
import { AdminLogin } from '../components/admin/AdminLogin'
import { BannerAdmin } from '../components/admin/BannerAdmin'
import { DeletedProductsModal } from '../components/admin/DeletedProductsModal'
import { PageViewStats } from '../components/admin/PageViewStats'
import { RevenueStatsPanel } from '../components/admin/RevenueStatsPanel'
import { DeletedOrdersPanel } from '../components/admin/DeletedOrdersPanel'
import { OrderTable } from '../components/admin/OrderTable'
import { ProductEditModal } from '../components/admin/ProductEditModal'
import { ProductForm } from '../components/admin/ProductForm'
import { CustomerAdmin } from '../components/admin/CustomerAdmin'
import { PointShopAdmin } from '../components/admin/PointShopAdmin'
import { PromotionsAdmin } from '../components/admin/PromotionsAdmin'
import { ProductListAdmin } from '../components/admin/ProductListAdmin'
import { FortuneConsultationAdmin } from '../components/admin/FortuneConsultationAdmin'
import { WishBoardAdmin } from '../components/admin/WishBoardAdmin'
import { useOrders } from '../hooks/useOrders'
import { useBanners } from '../hooks/useBanners'
import { usePageViewStats } from '../hooks/usePageViewStats'
import { usePageViewTimeSlotStats } from '../hooks/usePageViewTimeSlotStats'
import { useProductShareStats } from '../hooks/useProductShareStats'
import { useProductViewStats } from '../hooks/useProductViewStats'
import { useAdminActivityLogs } from '../hooks/useAdminActivityLogs'
import { useProducts } from '../hooks/useProducts'
import { ADMIN_ROLE_LABELS } from '../constants/adminAccounts'
import { useAdminSession } from '../hooks/useAdminSession'
import { getAdminDisplayName, logoutAdmin } from '../lib/adminAuth'
import { AdminAlertsBar, AdminTabBadge } from '../components/admin/AdminAlertsBar'
import { Toast } from '../components/ui/Toast'
import { ScrollToTopFab } from '../components/ui/ScrollToTopFab'
import { useAdminAlerts } from '../hooks/useAdminAlerts'
import { Archive, Plus } from 'lucide-react'

type AdminTab =
  | 'products'
  | 'point_shop'
  | 'promotions'
  | 'customers'
  | 'orders'
  | 'revenue'
  | 'banners'
  | 'wish_board'
  | 'fortune_consultation'
  | 'analytics'
  | 'logs'

const ALL_ADMIN_TABS: { id: AdminTab; label: string; superOnly?: boolean }[] = [
  { id: 'products', label: '商品管理' },
  { id: 'point_shop', label: '點數商城' },
  { id: 'promotions', label: '優惠活動' },
  { id: 'customers', label: '客戶資料' },
  { id: 'orders', label: '訂單管理' },
  { id: 'banners', label: '公告橫幅' },
  { id: 'wish_board', label: '許願留言' },
  { id: 'fortune_consultation', label: '命理諮詢' },
  { id: 'analytics', label: '瀏覽統計' },
  { id: 'revenue', label: '收入統計', superOnly: true },
  { id: 'logs', label: '後台日誌', superOnly: true },
]

/** 賣家後台管理頁 */
export function AdminPage() {
  const { authed, displayName: adminName, role, isSuperAdmin, refresh } =
    useAdminSession()
  const [activeTab, setActiveTab] = useState<AdminTab>('products')
  const [orderListView, setOrderListView] = useState<'active' | 'deleted'>('active')
  const [showDeleted, setShowDeleted] = useState(false)
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const editReopenLockRef = useRef(false)
  const { products, reload: reloadProducts } = useProducts()
  const editingProduct = useMemo(
    () => products.find((p) => p.id === editingProductId) ?? null,
    [products, editingProductId]
  )
  const { orders, loading: ordersLoading, reload: reloadOrders } = useOrders(authed)
  const {
    alerts,
    orderBadge,
    memberBadge,
    toast: alertToast,
    listening,
    desktopPermission,
    requestDesktopNotifications,
    clearOrderBadge,
    clearMemberBadge,
    dismissToast,
    clearAlerts,
  } = useAdminAlerts({
    enabled: authed,
    onNewOrders: () => void reloadOrders({ silent: true }),
    onNewMembers: () => setCustomerReloadSignal((n) => n + 1),
  })
  const [customerReloadSignal, setCustomerReloadSignal] = useState(0)
  const {
    stats: pageViewStats,
    loading: pageViewLoading,
    error: pageViewError,
    reload: reloadPageViewStats,
  } = usePageViewStats(authed)
  const {
    stats: productViewStats,
    statsByProductId,
    loading: productViewLoading,
    error: productViewError,
    reload: reloadProductViewStats,
  } = useProductViewStats(authed)
  const {
    statsByProductId: shareStatsByProductId,
    loading: productShareLoading,
    error: productShareError,
    reload: reloadProductShareStats,
  } = useProductShareStats(authed)
  const {
    slots: pageViewTimeSlots,
    loading: timeSlotLoading,
    error: timeSlotError,
    reload: reloadTimeSlotStats,
  } = usePageViewTimeSlotStats(authed)
  const {
    banners,
    error: bannerError,
    reload: reloadBanners,
  } = useBanners({ admin: true, enabled: authed })
  const {
    logs: activityLogs,
    loading: activityLogsLoading,
    error: activityLogsError,
    reload: reloadActivityLogs,
  } = useAdminActivityLogs(authed && activeTab === 'logs')

  const reloadAnalytics = () => {
    reloadPageViewStats()
    reloadProductViewStats()
    reloadProductShareStats()
    reloadTimeSlotStats()
  }

  const analyticsLoading =
    pageViewLoading || productViewLoading || productShareLoading || timeSlotLoading

  const adminTabs = useMemo(
    () => ALL_ADMIN_TABS.filter((tab) => isSuperAdmin || !tab.superOnly),
    [isSuperAdmin]
  )

  useEffect(() => {
    if (!isSuperAdmin && (activeTab === 'revenue' || activeTab === 'logs')) {
      setActiveTab('products')
    }
  }, [isSuperAdmin, activeTab])

  useEffect(() => {
    if (!isSuperAdmin && orderListView === 'deleted') {
      setOrderListView('active')
    }
  }, [isSuperAdmin, orderListView])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'orders') clearOrderBadge()
    if (activeTab === 'customers') {
      clearMemberBadge()
      setCustomerReloadSignal((n) => n + 1)
    }
  }, [activeTab, clearOrderBadge, clearMemberBadge])

  if (!authed) {
    return <AdminLogin onSuccess={refresh} />
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-amber-glow">晶刻 · 管理後台</h1>
          <p className="mt-2 text-base text-amber-glow/90">
            Hi，{adminName ?? getAdminDisplayName() ?? '管理者'}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {ADMIN_ROLE_LABELS[role]} · Crystomade · 訂單與商品管理
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            logoutAdmin()
            refresh()
          }}
          className="text-sm text-white/40 hover:text-white/70"
        >
          後台登出
        </button>
      </div>

      <AdminAlertsBar
        alerts={alerts}
        listening={listening}
        desktopPermission={desktopPermission}
        onRequestDesktop={() => void requestDesktopNotifications()}
        onClearAlerts={clearAlerts}
        onGoOrders={() => setActiveTab('orders')}
        onGoCustomers={() => setActiveTab('customers')}
      />

      <nav
        className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4"
        aria-label="後台功能分頁"
      >
        {adminTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const badge =
            tab.id === 'orders' ? orderBadge : tab.id === 'customers' ? memberBadge : 0
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
              <AdminTabBadge count={badge} />
            </button>
          )
        })}
      </nav>

      <div role="tabpanel">
        {activeTab === 'products' && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg tracking-wide text-white/80">商品管理</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProduct(true)}
                  className="flex items-center gap-2 rounded-lg border border-amber-glow/40 bg-amber-glow/10 px-4 py-2 text-sm text-amber-glow transition hover:border-amber-glow/60 hover:bg-amber-glow/15"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  新增商品
                </button>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowDeleted(true)}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow"
                  >
                    <Archive className="h-4 w-4" strokeWidth={1.5} />
                    已刪除物品
                  </button>
                )}
              </div>
            </div>
            <ProductListAdmin
              products={products}
              viewStatsByProductId={statsByProductId}
              shareStatsByProductId={shareStatsByProductId}
              viewStatsError={productViewError}
              shareStatsError={productShareError}
              onUpdated={() => {
                reloadProducts()
                reloadProductViewStats()
                reloadProductShareStats()
              }}
              onEditProduct={(product) => {
                if (editReopenLockRef.current) return
                setEditingProductId(product.id)
              }}
            />
            {editingProductId && editingProduct && (
              <ProductEditModal
                key={editingProductId}
                product={editingProduct}
                onClose={() => setEditingProductId(null)}
                onSaved={() => {
                  editReopenLockRef.current = true
                  setEditingProductId(null)
                  reloadProducts()
                  reloadProductViewStats()
                  reloadProductShareStats()
                  window.setTimeout(() => {
                    editReopenLockRef.current = false
                  }, 400)
                }}
              />
            )}
            <ProductForm
              open={showCreateProduct}
              onClose={() => setShowCreateProduct(false)}
              onCreated={reloadProducts}
            />
          </section>
        )}

        {activeTab === 'point_shop' && (
          <section>
            <h2 className="mb-4 text-lg tracking-wide text-white/80">點數商城編輯</h2>
            <PointShopAdmin />
          </section>
        )}

        {activeTab === 'promotions' && (
          <section>
            <h2 className="mb-4 text-lg tracking-wide text-white/80">優惠活動</h2>
            <PromotionsAdmin enabled={authed} />
          </section>
        )}

        {activeTab === 'customers' && (
          <section>
            <h2 className="mb-4 text-lg tracking-wide text-white/80">客戶資料</h2>
            <CustomerAdmin enabled={authed} reloadSignal={customerReloadSignal} />
          </section>
        )}

        {activeTab === 'orders' && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg tracking-wide text-white/80">訂單管理</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOrderListView('active')}
                  className={`rounded-full border px-4 py-2 text-sm tracking-wide transition ${
                    orderListView === 'active'
                      ? 'border-amber-glow/60 bg-amber-glow/15 text-amber-glow'
                      : 'border-white/15 text-white/55 hover:border-amber-glow/40 hover:text-amber-glow'
                  }`}
                >
                  訂單明細
                </button>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setOrderListView('deleted')}
                    className={`rounded-full border px-4 py-2 text-sm tracking-wide transition ${
                      orderListView === 'deleted'
                        ? 'border-amber-glow/60 bg-amber-glow/15 text-amber-glow'
                        : 'border-white/15 text-white/55 hover:border-amber-glow/40 hover:text-amber-glow'
                    }`}
                  >
                    已刪除訂單
                  </button>
                )}
              </div>
            </div>

            {orderListView === 'active' ? (
              <OrderTable
                orders={orders}
                loading={ordersLoading}
                onUpdated={(options) => void reloadOrders(options)}
                onDeleted={() => void reloadOrders({ silent: true })}
              />
            ) : (
              <DeletedOrdersPanel
                enabled={authed}
                onRestored={() => void reloadOrders({ silent: true })}
              />
            )}
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

        {activeTab === 'wish_board' && (
          <section>
            <h2 className="mb-4 text-lg tracking-wide text-white/80">許願留言</h2>
            <p className="mb-4 text-sm text-white/45">
              會員在前台提交的許願留言，僅供後台查看與參考。
            </p>
            <WishBoardAdmin enabled={authed} />
          </section>
        )}

        {activeTab === 'fortune_consultation' && (
          <section>
            <h2 className="mb-4 text-lg tracking-wide text-white/80">命理諮詢</h2>
            <p className="mb-4 text-sm text-white/45">
              客戶填寫的諮詢問題與 Line ID，供命理老師聯絡使用。
            </p>
            <FortuneConsultationAdmin enabled={authed} />
          </section>
        )}

        {activeTab === 'analytics' && (
          <PageViewStats
            stats={pageViewStats}
            products={products}
            productViewStats={productViewStats}
            productViewError={productViewError}
            timeSlots={pageViewTimeSlots}
            timeSlotError={timeSlotError}
            loading={analyticsLoading}
            error={pageViewError}
            onReload={reloadAnalytics}
          />
        )}

        {isSuperAdmin && activeTab === 'revenue' && (
          <RevenueStatsPanel
            orders={orders}
            loading={ordersLoading}
            onReload={() => void reloadOrders()}
          />
        )}

        {isSuperAdmin && activeTab === 'logs' && (
          <AdminActivityLogPanel
            logs={activityLogs}
            loading={activityLogsLoading}
            error={activityLogsError}
            onReload={reloadActivityLogs}
          />
        )}
      </div>

      <Toast message={alertToast} onDismiss={dismissToast} durationMs={4500} />

      <ScrollToTopFab ariaLabel="回到後台頂部" title="回到後台頂部" />

      {isSuperAdmin && showDeleted && (
        <DeletedProductsModal
          onClose={() => setShowDeleted(false)}
          onRestored={reloadProducts}
        />
      )}
    </div>
  )
}
