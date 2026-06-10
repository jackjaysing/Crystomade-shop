import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { MemberAuthForm } from '../components/member/MemberAuthForm'
import { PointProductCard } from '../components/point-shop/PointProductCard'
import { GlassPanel } from '../components/ui/GlassPanel'
import { MetalDivider } from '../components/ui/MetalDivider'
import {
  FIRST_PURCHASE_POINTS_MULTIPLIER,
  MAX_ORDER_DISCOUNT_RATE,
  POINTS_PER_NTD_DISCOUNT,
  POINTS_PER_NTD_EARN,
  WELCOME_BONUS_POINTS,
} from '../constants/points'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { usePointProducts } from '../hooks/usePointProducts'
import { usePointRedeemState } from '../hooks/usePointRedeemState'

/** 前台點數商城：瀏覽與兌換 */
export function PointShopPage() {
  const { user, profile } = useAuth()
  const { products, loading } = usePointProducts(true)
  const { addPointRedemption, openCart } = useCart()
  const { availablePoints, pointsReserved, getState } = usePointRedeemState()

  const handleRedeem = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    addPointRedemption(product)
    openCart()
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-6xl px-6">
        <section aria-labelledby="point-shop-heading">
        <p className="text-xs tracking-[0.4em] text-amber-glow/60">POINT SHOP</p>
        <h1 id="point-shop-heading" className="mt-2 font-display text-4xl text-white sm:text-5xl">點數商城</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          使用累積點數兌換精選好禮，加入購物車後與典藏商品一併結帳。兌換商品為
          NT$0且不可折抵運費；若購物車僅有兌換品，仍需支付運費。
        </p>

        {profile ? (
          <GlassPanel className="mt-8 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-glow/30 bg-amber-glow/10">
                <Sparkles className="h-6 w-6 text-amber-glow" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs tracking-widest text-white/45">可用點數</p>
                <p className="font-display text-4xl text-amber-glow">
                  {availablePoints}
                </p>
                {pointsReserved > 0 && (
                  <p className="mt-1 text-xs text-white/40">
                    購物車已預留 {pointsReserved} 點
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/account"
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:border-amber-glow/40 hover:text-amber-glow"
              >
                會員中心
              </Link>
              <button
                type="button"
                onClick={openCart}
                className="rounded-lg bg-amber-glow/90 px-4 py-2.5 text-sm font-medium tracking-wide text-void transition hover:bg-amber-glow"
              >
                前往購物車
              </button>
            </div>
          </GlassPanel>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <GlassPanel className="p-6 sm:p-8">
              <p className="text-sm text-white/60">
                登入會員即可使用點數兌換。新會員註冊贈{' '}
                <span className="text-amber-glow">{WELCOME_BONUS_POINTS}</span> 點。
              </p>
              <ul className="mt-4 space-y-2 text-xs text-white/40">
                <li>· 會員消費回饋 2%（每 NT${POINTS_PER_NTD_EARN} 累 1 點）</li>
                <li>
                  · 每 {POINTS_PER_NTD_DISCOUNT} 點可折 NT$1（結帳時使用，上限{' '}
                  {Math.round(MAX_ORDER_DISCOUNT_RATE * 100)}%）
                </li>
                <li>· 首購 {FIRST_PURCHASE_POINTS_MULTIPLIER} 倍累點</li>
              </ul>
            </GlassPanel>
            <MemberAuthForm variant="page" />
          </div>
        )}

        <div className="my-10">
          <MetalDivider />
        </div>

        <section aria-labelledby="point-products-heading">
          <h2 id="point-products-heading" className="text-sm tracking-[0.3em] text-white/50">兌換商品</h2>

          {loading ? (
            <p className="mt-8 text-center text-sm text-white/40">載入中…</p>
          ) : products.length === 0 ? (
            <GlassPanel className="mt-6 p-10 text-center">
              <p className="text-white/50">目前尚無可兌換商品，敬請期待。</p>
              <Link
                to="/products"
                className="mt-4 inline-block text-sm text-amber-glow hover:underline"
              >
                前往典藏選購
              </Link>
            </GlassPanel>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {products.map((product) => (
                <li key={product.id}>
                  <PointProductCard
                    product={product}
                    buttonState={getState(product)}
                    onRedeem={() => handleRedeem(product.id)}
                    variant="grid"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {!user && products.length > 0 && (
          <p className="mt-8 text-center text-sm text-white/40">
            瀏覽不需登入；點選「登入兌換」即可註冊或登入會員。
          </p>
        )}
        </section>
      </div>
    </div>
  )
}
