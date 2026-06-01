import { Navigate, Route, Routes } from 'react-router-dom'
import { PageViewTracker } from './components/analytics/PageViewTracker'
import { CartProvider } from './contexts/CartContext'
import { Navbar } from './components/layout/Navbar'
import { EnvSetupBanner } from './components/ui/EnvSetupBanner'
import { AdminPage } from './pages/AdminPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ProductsPage } from './pages/ProductsPage'

/** 應用程式路由 */
export default function App() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-void text-white">
        <EnvSetupBanner />
        <Navbar />
        <PageViewTracker />
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </CartProvider>
  )
}
