import { LayoutDashboard, ShoppingCart, Store, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  PRODUCTS_LIST_RESET_STATE,
  requestProductsListReset,
} from '../../lib/productsListReset'
import { CartDrawer } from '../cart/CartDrawer'
import { MemberPointsBadge } from '../member/MemberPointsBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { usePointRedeemState } from '../../hooks/usePointRedeemState'
import { useAdminSession } from '../../hooks/useAdminSession'
import { useCartAvailability } from '../../hooks/useCartAvailability'

const NAV_ICON_GAP = 'gap-1.5'

function navIconClass(active: boolean): string {
  return `relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
    active
      ? 'border-amber-glow/50 bg-amber-glow/15 text-amber-glow'
      : 'border-white/10 text-white/70 hover:border-amber-glow/40 hover:text-amber-glow'
  }`
}

/** 全站導覽列 */
export function Navbar() {
  const { pathname } = useLocation()
  const isProducts = pathname.startsWith('/products')
  const isAcademy = pathname.startsWith('/academy')
  const isPointShop = pathname.startsWith('/point-shop')
  const isAccount = pathname.startsWith('/account')
  const isAdmin = pathname.startsWith('/admin')
  const { profile } = useAuth()
  const { authed: adminAuthed } = useAdminSession()
  const { availablePoints } = usePointRedeemState()
  const { openCart } = useCart()
  const { checkoutItemCount } = useCartAvailability()

  const productsLinkState = { [PRODUCTS_LIST_RESET_STATE]: true }

  const handleProductsNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/products') {
      event.preventDefault()
      requestProductsListReset()
    }
  }

  return (
    <>
      <header
        id="site-header"
        className="fixed top-0 z-40 flex h-[var(--site-header-height)] w-full items-center border-b border-white/[0.06] bg-black"
      >
        <div className="mx-auto flex h-full w-full min-w-0 max-w-7xl items-center gap-1.5 px-3 sm:gap-3 sm:px-6">
          <Link
            to="/products"
            state={productsLinkState}
            onClick={handleProductsNavClick}
            className="group flex shrink-0 items-center gap-1 transition hover:opacity-90 sm:gap-1.5"
            aria-label="晶刻 Crystomade"
          >
            <img
              src="/logomark.png"
              alt="晶刻 Crystomade 品牌標誌"
              width={40}
              height={40}
              className="block h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"
            />
            <img
              src="/logoword.png"
              alt=""
              aria-hidden="true"
              className="block h-7 w-auto max-w-[5.5rem] shrink-0 object-contain object-left sm:h-9 sm:max-w-none md:h-10"
            />
          </Link>

          <nav
            className={`ml-auto flex min-w-0 flex-1 items-center justify-end ${NAV_ICON_GAP} text-sm md:gap-6`}
          >
            <div className={`flex shrink-0 items-center ${NAV_ICON_GAP} md:gap-6`}>
              <div className="hidden items-center gap-6 md:flex">
                <Link
                  to="/products"
                  state={productsLinkState}
                  onClick={handleProductsNavClick}
                  className={`tracking-wide transition ${
                    isProducts ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  典藏
                </Link>
                <Link
                  to="/academy"
                  className={`tracking-wide transition ${
                    isAcademy ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  晶研所
                </Link>
                <Link
                  to="/point-shop"
                  className={`flex items-center gap-1 tracking-wide transition ${
                    isPointShop ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Store className="h-4 w-4" strokeWidth={1.5} />
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
                {adminAuthed && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1 tracking-wide transition ${
                      isAdmin ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                    後台
                  </Link>
                )}
              </div>

              <div
                className={`flex min-w-0 items-center ${NAV_ICON_GAP} md:hidden`}
              >
                <Link
                  to="/products"
                  state={productsLinkState}
                  onClick={handleProductsNavClick}
                  className={`shrink-0 text-xs tracking-wide transition sm:text-sm ${
                    isProducts ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  典藏
                </Link>
                <Link
                  to="/academy"
                  className={`shrink-0 text-xs tracking-wide transition sm:text-sm ${
                    isAcademy ? 'text-amber-glow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  晶研
                </Link>
                <Link
                  to="/point-shop"
                  className={navIconClass(isPointShop)}
                  aria-label={
                    profile
                      ? `點數商城，可用 ${availablePoints} 點`
                      : '點數商城'
                  }
                >
                  <Store className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  {profile && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-glow px-1 text-[10px] font-medium tabular-nums text-void">
                      {availablePoints > 999 ? '999+' : availablePoints}
                    </span>
                  )}
                </Link>
                <Link
                  to="/account"
                  className={navIconClass(isAccount)}
                  aria-label={profile ? '會員中心' : '會員登入'}
                >
                  <User className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={openCart}
              className={`${navIconClass(false)} shrink-0 max-md:shadow-[4px_0_12px_rgba(0,0,0,0.45)]`}
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
