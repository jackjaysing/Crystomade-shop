import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { MemberAuthForm } from '../member/MemberAuthForm'
import { GlassPanel } from '../ui/GlassPanel'

interface CheckoutLoginGateProps {
  cartItemCount: number
  onAuthSuccess?: () => void
  onCancel?: () => void
}

/** 結帳前須先登入／註冊 */
export function CheckoutLoginGate({
  cartItemCount,
  onAuthSuccess,
  onCancel,
}: CheckoutLoginGateProps) {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-md px-6">
        <section aria-labelledby="checkout-login-heading">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.4em] text-amber-glow/60">CHECKOUT</p>
              <h1
                id="checkout-login-heading"
                className="mt-2 font-display text-4xl text-white"
              >
                登入後結帳
              </h1>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-amber-glow/50 hover:text-amber-glow"
                aria-label="取消結帳"
                title="取消結帳"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            結帳與下單須先成為會員。您可先將商品加入購物車，登入或註冊後即可繼續完成訂單。
          </p>

          {cartItemCount > 0 && (
            <GlassPanel className="mt-6 border-amber-glow/20 px-5 py-4 text-center">
              <p className="text-xs tracking-widest text-white/45">購物車</p>
              <p className="mt-1 text-sm text-white/70">
                已保留 <span className="font-medium text-amber-glow">{cartItemCount}</span>{' '}
                件商品，登入後即可結帳
              </p>
            </GlassPanel>
          )}

          <div className="mt-6">
            <MemberAuthForm
              variant="page"
              initialMode="login"
              onSuccess={onAuthSuccess}
            />
          </div>

          <div className="mt-6 space-y-3 text-center text-sm text-white/40">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="block w-full text-white/55 transition hover:text-amber-glow"
              >
                取消結帳，返回購物車
              </button>
            )}
            <Link to="/products" className="hover:text-amber-glow">
              返回典藏繼續選購
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
