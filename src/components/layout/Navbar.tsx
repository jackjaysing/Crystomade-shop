import { LayoutDashboard, ShoppingCart, Store, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { CartDrawer } from '../cart/CartDrawer'
import { MemberPointsBadge } from '../member/MemberPointsBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { usePointRedeemState } from '../../hooks/usePointRedeemState'
import { useAdminSession } from '../../hooks/useAdminSession'
import { useCartAvailability } from '../../hooks/useCartAvailability'

const NAV_ICON_GAP = 'gap-2'

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
  const isPointShop = pathname.startsWith('/point-shop')
  const isAccount = pathname.startsWith('/account')
  const isAdmin = pathname.startsWith('/admin')
  const { profile } = useAuth()
  const { authed: adminAuthed } = useAdminSession()
  const { availablePoints } = usePointRedeemState()
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
              className="block h-[2.125rem] w-auto max-w-[7.25rem] flex-none object-contain object-left sm:h-9 sm:max-w-none md:h-10"
            />
          </Link>

          <nav
            className={`flex shrink-0 items-center ${NAV_ICON_GAP} text-sm md:gap-6`}
          >
            <Link
              to="/products"
              className={`shrink-0 tracking-wide transition ${
                isProducts ? 'text-amber-glow' : 'text-white/60 hover:text-white'
              }`}
            >
              典藏
            </Link>

            <div className="hidden items-center gap-6 md:flex">
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

            <div className={`flex items-center ${NAV_ICON_GAP} md:hidden`}>
              <div className="flex items-center gap-1.5">
                <Link
                  to="/point-shop"
                  className={navIconClass(isPointShop)}
                  aria-label={
                    profile ? `點數商城，可用 ${availablePoints} 點` : '點數商城'
                  }
                >
                  <Store className="h-5 w-5" strokeWidth={1.5} />
                </Link>
                {profile && (
                  <span
                    className={`whitespace-nowrap text-xs font-medium tabular-nums ${
                      isPointShop ? 'text-amber-glow' : 'text-white/70'
                    }`}
                  >
                    {availablePoints > 999 ? '999+' : availablePoints} 點
                  </span>
                )}
              </div>
              <Link
                to="/account"
                className={navIconClass(isAccount)}
                aria-label={profile ? '會員中心' : '會員登入'}
              >
                <User className="h-5 w-5" strokeWidth={1.5} />
              </Link>
              {adminAuthed && (
                <Link
                  to="/admin"
                  className={navIconClass(isAdmin)}
                  aria-label="後台管理"
                >
                  <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={openCart}
              className={navIconClass(false)}
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
