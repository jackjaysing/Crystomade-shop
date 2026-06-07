import { Navigate, Route, Routes } from 'react-router-dom'
import { PageViewTracker } from './components/analytics/PageViewTracker'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { Navbar } from './components/layout/Navbar'
import { SiteFooter } from './components/layout/SiteFooter'
import { EnvSetupBanner } from './components/ui/EnvSetupBanner'
import { AdminPage } from './pages/AdminPage'
import { AccountPage } from './pages/AccountPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PointShopPage } from './pages/PointShopPage'
import { ProductsPage } from './pages/ProductsPage'
import { WishBoardPage } from './pages/WishBoardPage'
import { RaffleFloatingWidget } from './components/raffle/RaffleFloatingWidget'
import { SiteMetaSync } from './components/seo/SiteMetaSync'

/** 應用程式路由 */
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex min-h-screen flex-col bg-void text-white">
          <EnvSetupBanner />
          <Navbar />
          <PageViewTracker />
          <SiteMetaSync />
          <main id="main-content" className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/products" replace />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/point-shop" element={<PointShopPage />} />
              <Route path="/wish-board" element={<WishBoardPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <SiteFooter />
          <RaffleFloatingWidget />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}
