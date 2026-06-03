import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import type { PointProduct } from '../lib/types'

export type PointRedeemButtonState =
  | 'guest'
  | 'redeem'
  | 'in_cart'
  | 'insufficient'
  | 'sold_out'

export function getPointRedeemButtonState(
  product: PointProduct,
  options: {
    isLoggedIn: boolean
    availablePoints: number
    inCart: boolean
  }
): PointRedeemButtonState {
  if (!options.isLoggedIn) return 'guest'
  if (options.inCart) return 'in_cart'
  if (product.stock <= 0) return 'sold_out'
  if (options.availablePoints < product.required_points) return 'insufficient'
  return 'redeem'
}

export function getPointRedeemButtonLabel(state: PointRedeemButtonState): string {
  switch (state) {
    case 'guest':
      return '登入兌換'
    case 'redeem':
      return '加入購物車兌換'
    case 'in_cart':
      return '已在購物車'
    case 'insufficient':
      return '點數不足'
    case 'sold_out':
      return '已售罄'
  }
}

/** 會員點數與購物車兌換品預留狀態 */
export function usePointRedeemState() {
  const { user, profile } = useAuth()
  const { items } = useCart()

  const pointsReserved = useMemo(
    () =>
      items
        .filter((i) => i.kind === 'point_redemption')
        .reduce((sum, i) => sum + (i.requiredPoints ?? 0) * i.quantity, 0),
    [items]
  )

  const availablePoints = Math.max(0, (profile?.points ?? 0) - pointsReserved)

  const redeemedIds = useMemo(
    () =>
      new Set(
        items
          .filter((i) => i.kind === 'point_redemption')
          .map((i) => i.pointProductId ?? i.productId)
      ),
    [items]
  )

  const getState = (product: PointProduct) =>
    getPointRedeemButtonState(product, {
      isLoggedIn: !!user && !!profile,
      availablePoints,
      inCart: redeemedIds.has(product.id),
    })

  return {
    user,
    profile,
    pointsReserved,
    availablePoints,
    redeemedIds,
    getState,
    getLabel: getPointRedeemButtonLabel,
  }
}
