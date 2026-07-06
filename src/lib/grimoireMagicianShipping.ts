import type { CartItem } from './types'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../constants/shipping'
import { calcProductSubtotal, calcShippingFeeForCart } from './cartShipping'

export interface MagicianShippingQuota {
  eligible: boolean
  tier: number
  totalXp: number
  limit: number
  used: number
  remaining: number
  periodKey: string | null
}

export interface MagicianShippingOptions {
  useMagicianShipping?: boolean
  magicianRemaining?: number
}

/** 標準運費（未達滿額門檻、有付費商品時） */
export function baseShippingFeeForCart(items: CartItem[]): number {
  return calcShippingFeeForCart(items)
}

/** 套用魔法師免運額度後的運費 */
export function calcShippingFeeWithMagicianPerk(
  items: CartItem[],
  options: MagicianShippingOptions = {}
): number {
  const base = baseShippingFeeForCart(items)
  if (base === 0) return 0
  if (options.useMagicianShipping && (options.magicianRemaining ?? 0) > 0) {
    return 0
  }
  return base
}

export function canOfferMagicianShipping(
  items: CartItem[],
  quota: MagicianShippingQuota | null | undefined
): boolean {
  if (!quota?.eligible || quota.remaining <= 0) return false
  const subtotal = calcProductSubtotal(items)
  if (subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD) return false
  return baseShippingFeeForCart(items) === SHIPPING_FEE
}

export function magicianShippingPeriodLabel(periodKey: string | null): string {
  if (!periodKey) return ''
  if (periodKey.includes('-Q')) {
    return periodKey.replace('-Q', ' 年第 ') + ' 季'
  }
  const [year, month] = periodKey.split('-')
  if (year && month) return `${year} 年 ${Number(month)} 月`
  return periodKey
}

export function parseMagicianShippingQuota(raw: unknown): MagicianShippingQuota {
  const row = (raw ?? {}) as Record<string, unknown>
  const eligible = Boolean(row.eligible)
  const limit = typeof row.limit === 'number' ? row.limit : Number(row.limit) || 0
  const used = typeof row.used === 'number' ? row.used : Number(row.used) || 0
  const remaining =
    typeof row.remaining === 'number' ? row.remaining : Number(row.remaining) || 0

  return {
    eligible,
    tier: typeof row.tier === 'number' ? row.tier : Number(row.tier) || 0,
    totalXp: typeof row.total_xp === 'number' ? row.total_xp : Number(row.total_xp) || 0,
    limit,
    used,
    remaining: eligible ? Math.max(0, remaining) : 0,
    periodKey: row.period_key != null ? String(row.period_key) : null,
  }
}
