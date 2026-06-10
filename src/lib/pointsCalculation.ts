import {
  FIRST_PURCHASE_POINTS_MULTIPLIER,
  MAX_ORDER_DISCOUNT_RATE,
  POINTS_PER_NTD_DISCOUNT,
  POINTS_PER_NTD_EARN,
} from '../constants/points'

/** 消費金額可獲得的點數（滿 NT$5 累 1 點，不滿不計） */
export function calcEarnedPointsFromSpent(ntd: number): number {
  if (ntd <= 0) return 0
  return Math.floor(ntd / POINTS_PER_NTD_EARN)
}

/** 消費贈點（含首購加倍） */
export function calcEarnedPointsFromSpentWithBonus(
  ntd: number,
  firstPurchase: boolean
): number {
  const base = calcEarnedPointsFromSpent(ntd)
  if (base <= 0) return 0
  return firstPurchase ? base * FIRST_PURCHASE_POINTS_MULTIPLIER : base
}

/** 消費贈點折抵價值（NT$） */
export function calcEarnedRewardNtdFromSpent(
  ntd: number,
  firstPurchase = false
): number {
  return calcDiscountNtdFromPoints(
    calcEarnedPointsFromSpentWithBonus(ntd, firstPurchase)
  )
}

/** 點數可折抵的現金（NT$） */
export function calcDiscountNtdFromPoints(points: number): number {
  if (points <= 0) return 0
  return Math.floor(points / POINTS_PER_NTD_DISCOUNT)
}

/** 折抵 NT$ 所需點數 */
export function calcPointsForDiscountNtd(ntd: number): number {
  if (ntd <= 0) return 0
  return ntd * POINTS_PER_NTD_DISCOUNT
}

/** 本筆訂單商品小計可折抵上限（NT$）：15% 上限、不得超過小計、不得超過持有點數 */
export function calcMaxDiscountNtd(
  productSubtotal: number,
  memberPoints: number
): number {
  if (productSubtotal <= 0 || memberPoints <= 0) return 0
  const capByRate = Math.floor(productSubtotal * MAX_ORDER_DISCOUNT_RATE)
  const capByPoints = calcDiscountNtdFromPoints(memberPoints)
  return Math.min(productSubtotal, capByRate, capByPoints)
}

/** 欲用盡目前點數折抵，下一筆訂單商品小計至少需達此金額（受 15% 上限） */
export function calcMinSubtotalToUseAllPointsDiscount(memberPoints: number): number {
  const discountNtd = calcDiscountNtdFromPoints(memberPoints)
  if (discountNtd <= 0) return 0
  return Math.ceil(discountNtd / MAX_ORDER_DISCOUNT_RATE)
}

/** 將使用者選擇的折抵點數限制在合法範圍（需扣除兌換品已預留點數） */
export function clampPointsForDiscount(
  requestedPoints: number,
  productSubtotal: number,
  memberPoints: number,
  pointsReservedForRedemption = 0
): number {
  const available = Math.max(0, memberPoints - pointsReservedForRedemption)
  const maxNtd = calcMaxDiscountNtd(productSubtotal, available)
  const maxPoints = calcPointsForDiscountNtd(maxNtd)
  return Math.max(0, Math.min(Math.floor(requestedPoints), maxPoints, available))
}
