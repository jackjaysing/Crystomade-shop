import { ShoppingCart } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { CartDrawer } from '../cart/CartDrawer'
import { useCart } from '../../contexts/CartContext'
import { useCartAvailability } from '../../hooks/useCartAvailability'

/** 全站導覽列 */
export function Navbar() {
  const { pathname } = useLocation()
  const isProducts = pathname.startsWith('/products')
  const { openCart } = useCart()
  const { checkoutItemCount } = useCartAvailability()

  return (
    <>
      <header className="fixed top-0 z-40 w-full border-b border-white/[0.06] bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/products"
            className="group flex items-center gap-2.5 transition hover:opacity-90 sm:gap-3"
            aria-label="晶刻 Crystomade"
          >
            <img
              src="/logomark.png"
              alt=""
              className="h-10 w-auto shrink-0 object-contain sm:h-11"
            />
            <img
              src="/logoword.png"
              alt=""
              className="h-8 w-auto object-contain object-left sm:h-10"
            />
          </Link>

          <nav className="flex items-center gap-4 text-sm sm:gap-6">
            <Link
              to="/products"
              className={`tracking-wide transition ${
                isProducts ? 'text-amber-glow' : 'text-white/60 hover:text-white'
              }`}
            >
              典藏
            </Link>
            <Link
              to="/admin"
              className="text-white/40 transition hover:text-white/70"
            >
              管理
            </Link>

            <button
              type="button"
              onClick={openCart}
              className="relative rounded-full border border-white/10 p-2.5 text-white/70 transition hover:border-amber-glow/40 hover:text-amber-glow"
              aria-label={`購物車，${checkoutItemCount} 件可結帳商品`}
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.5} />
              {checkoutItemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-glow px-1 text-[10px] font-medium text-void">
                  {checkoutItemCount > 99 ? '99+' : checkoutItemCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <CartDrawer />
    </>
  )
}
