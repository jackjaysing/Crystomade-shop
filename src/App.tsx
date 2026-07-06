import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PageViewTracker } from './components/analytics/PageViewTracker'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { Navbar } from './components/layout/Navbar'
import { ScrollToTopOnNavigate } from './components/layout/ScrollToTopOnNavigate'
import { SiteFooter } from './components/layout/SiteFooter'
import { EnvSetupBanner } from './components/ui/EnvSetupBanner'
import { AdminPage } from './pages/AdminPage'
import { AccountPage } from './pages/AccountPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PointShopPage } from './pages/PointShopPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductsPage } from './pages/ProductsPage'
import { AcademyArticlePage } from './pages/AcademyArticlePage'
import { AcademyPage } from './pages/AcademyPage'
import { WishBoardPage } from './pages/WishBoardPage'
import { CrystalGrimoirePage } from './pages/CrystalGrimoirePage'
import { CrystalGrimoireDetailPage } from './pages/CrystalGrimoireDetailPage'
import { CrystalSoulCardGiftClaimPage } from './pages/CrystalSoulCardGiftClaimPage'
import { CrystalSoulCardActivationPage } from './pages/CrystalSoulCardActivationPage'
import { CrystalSoulCardPublicPage } from './pages/CrystalSoulCardPublicPage'
import { RaffleFloatingWidget } from './components/raffle/RaffleFloatingWidget'
import { SiteMetaSync } from './components/seo/SiteMetaSync'

/** /register?ref= 導向會員中心註冊（保留查詢字串） */
function RegisterRedirect() {
  const { search } = useLocation()
  return (
    <Navigate
      to={{ pathname: '/account', search }}
      replace
      state={{ register: true }}
    />
  )
}

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
          <ScrollToTopOnNavigate />
          <main id="main-content" className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/products" replace />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/point-shop" element={<PointShopPage />} />
              <Route path="/academy" element={<AcademyPage />} />
              <Route path="/academy/:slug" element={<AcademyArticlePage />} />
              <Route path="/wish-board" element={<WishBoardPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/register" element={<RegisterRedirect />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/account/grimoire" element={<CrystalGrimoirePage />} />
              <Route path="/account/grimoire/:cardId" element={<CrystalGrimoireDetailPage />} />
              <Route path="/grimoire/gift/:slug" element={<CrystalSoulCardGiftClaimPage />} />
              <Route path="/grimoire/sign/:slug" element={<CrystalSoulCardActivationPage />} />
              <Route path="/grimoire/:slug" element={<CrystalSoulCardPublicPage />} />
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
