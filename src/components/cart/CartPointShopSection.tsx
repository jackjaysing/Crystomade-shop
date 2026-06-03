import { Link } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { usePointProducts } from '../../hooks/usePointProducts'
import { usePointRedeemState } from '../../hooks/usePointRedeemState'
import { PointProductCard } from '../point-shop/PointProductCard'

interface CartPointShopSectionProps {
  enabled?: boolean
}

/** 購物車內：點數商城橫向兌換（精簡版，連至完整商城） */
export function CartPointShopSection({ enabled = true }: CartPointShopSectionProps) {
  const { addPointRedemption } = useCart()
  const { profile, availablePoints, pointsReserved, getState } = usePointRedeemState()
  const { products, loading } = usePointProducts(enabled)

  if (!loading && products.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-glow/25 bg-gradient-to-br from-amber-glow/[0.07] to-transparent p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          to="/point-shop"
          className="text-sm font-medium tracking-wide text-amber-glow/90 transition hover:text-amber-glow"
        >
          點數商城 →
        </Link>
        {profile ? (
          <p className="text-xs text-white/50">
            可用 <span className="text-amber-glow">{availablePoints}</span> 點
            {pointsReserved > 0 && (
              <span className="text-white/35">（已預留 {pointsReserved} 點）</span>
            )}
          </p>
        ) : (
          <Link to="/point-shop" className="text-xs text-white/45 hover:text-amber-glow">
            登入兌換
          </Link>
        )}
      </div>

      {loading ? (
        <p className="mt-3 text-center text-xs text-white/40">載入中…</p>
      ) : (
        <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
          <ul className="flex min-w-max gap-3">
            {products.map((product) => (
              <li key={product.id}>
                <PointProductCard
                  product={product}
                  buttonState={getState(product)}
                  onRedeem={() => addPointRedemption(product)}
                  variant="compact"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
