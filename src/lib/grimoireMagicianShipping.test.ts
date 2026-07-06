import { describe, expect, it } from 'vitest'
import type { CartItem } from './types'
import {
  calcShippingFeeWithMagicianPerk,
  canOfferMagicianShipping,
  parseMagicianShippingQuota,
} from './grimoireMagicianShipping'

const paidItem: CartItem = {
  productId: 'p1',
  name: '手串',
  price: 500,
  quantity: 1,
  cartItemKey: 'p1',
  maxStock: 5,
  image_url: '',
  selectedSize: null,
}

describe('calcShippingFeeWithMagicianPerk', () => {
  it('waives shipping when perk is applied', () => {
    const fee = calcShippingFeeWithMagicianPerk([paidItem], {
      useMagicianShipping: true,
      magicianRemaining: 1,
    })
    expect(fee).toBe(0)
  })

  it('keeps standard shipping when perk is not used', () => {
    expect(calcShippingFeeWithMagicianPerk([paidItem], {})).toBe(60)
  })
})

describe('canOfferMagicianShipping', () => {
  it('is true for eligible quota under threshold', () => {
    const eligible = canOfferMagicianShipping([paidItem], {
      eligible: true,
      tier: 5,
      totalXp: 720,
      limit: 1,
      used: 0,
      remaining: 1,
      periodKey: '2026-Q3',
    })
    expect(eligible).toBe(true)
  })
})

describe('parseMagicianShippingQuota', () => {
  it('normalizes RPC payload', () => {
    expect(
      parseMagicianShippingQuota({
        eligible: true,
        tier: 7,
        total_xp: 1100,
        limit: 2,
        used: 1,
        remaining: 1,
        period_key: '2026-07',
      })
    ).toEqual({
      eligible: true,
      tier: 7,
      totalXp: 1100,
      limit: 2,
      used: 1,
      remaining: 1,
      periodKey: '2026-07',
    })
  })
})
