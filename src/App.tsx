import { Navigate, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { EnvSetupBanner } from './components/ui/EnvSetupBanner'
import { AdminPage } from './pages/AdminPage'
import { ProductsPage } from './pages/ProductsPage'

/** 應用程式路由 */
export default function App() {
  return (
    <div className="min-h-screen bg-void text-white">
      <EnvSetupBanner />
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  )
}
