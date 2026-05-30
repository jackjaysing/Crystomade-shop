import { Link, useLocation } from 'react-router-dom'

/** 全站導覽列 */
export function Navbar() {
  const { pathname } = useLocation()
  const isProducts = pathname.startsWith('/products')

  return (
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

        <nav className="flex items-center gap-6 text-sm">
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
        </nav>
      </div>
    </header>
  )
}
