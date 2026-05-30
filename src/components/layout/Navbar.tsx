import { Link, useLocation } from 'react-router-dom'

/** 全站導覽列 */
export function Navbar() {
  const { pathname } = useLocation()
  const isProducts = pathname.startsWith('/products')

  return (
    <header className="fixed top-0 z-40 w-full border-b border-white/5 bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/products" className="group flex items-center gap-3">
          <span className="font-display text-2xl tracking-widest text-amber-glow transition group-hover:text-amber-deep">
            晶刻
          </span>
          <span className="hidden text-xs tracking-[0.3em] text-white/40 sm:inline">
            CRYSTOMADE
          </span>
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
