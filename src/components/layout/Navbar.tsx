import { ShoppingCart, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { CartDrawer } from '../cart/CartDrawer'
import { MemberHubMenu } from '../member/MemberHubMenu'
import { MemberPointsBadge } from '../member/MemberPointsBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { useCartAvailability } from '../../hooks/useCartAvailability'

/** 全站導覽列 */
export function Navbar() {
  const { pathname } = useLocation()
  const isProducts = pathname.startsWith('/products')
  const isPointShop = pathname.startsWith('/point-shop')
  const isAccount = pathname.startsWith('/account')
  const { profile } = useAuth()
  const { openCart } = useCart()
  const { checkoutItemCount } = useCartAvailability()

  return (
    <>
      <header className="fixed top-0 z-40 w-full overflow-visible border-b border-white/[0.06] bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 overflow-visible px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <Link
            to="/products"
            className="group flex shrink-0 items-center gap-1 overflow-visible transition hover:opacity-90 sm:gap-1.5"
            aria-label="晶刻 Crystomade"
          >
            <img
              src="/logomark.png"
              alt=""
              width={40}
              height={40}
              className="block h-9 w-9 flex-none object-contain sm:h-11 sm:w-11"
            />
            <img
              src="/logoword.png"
              alt="晶刻 Crystomade"
              className="block h-8 w-auto min-w-[4.25rem] flex-none object-contain object-left sm:h-9 md:h-10"
            />
          </Link>

          <nav className="flex shrink-0 items-center gap-1.5 text-sm sm:gap-4 md:gap-6">
            <Link
              to="/products"
              className={`hidden tracking-wide transition md:inline ${
                isProducts ? 'text-amber-glow' : 'text-white/60 hover:text-white'
              }`}
            >
              典藏
            </Link>

            <div className="hidden items-center gap-4 md:flex md:gap-6">
              <Link
                to="/point-shop"
                className={`tracking-wide transition ${
                  isPointShop ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                }`}
              >
                點數商城
              </Link>
              <MemberPointsBadge />
              <Link
                to="/account"
                className={`flex items-center gap-1 tracking-wide transition ${
                  isAccount ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                }`}
                aria-label="會員中心"
              >
                <User className="h-4 w-4" strokeWidth={1.5} />
                <span>{profile ? '會員' : '登入'}</span>
              </Link>
              <Link
                to="/admin"
                className="text-white/40 transition hover:text-white/70"
              >
                管理
              </Link>
            </div>

            <MemberHubMenu />

            <button
              type="button"
              onClick={openCart}
              className="relative shrink-0 rounded-full border border-white/10 p-2.5 text-white/70 transition hover:border-amber-glow/40 hover:text-amber-glow"
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
