import { describe, expect, it } from 'vitest'
import { detectShippingFee } from './orderGroupPricing'

describe('detectShippingFee', () => {
  it('keeps free courier shipping when coupon was applied after checkout', () => {
    // S=1600, F=0, C=100 → paid totals sum to 1500
    expect(detectShippingFee(1500, 0, 100, '宅配')).toBe(0)
  })

  it('keeps free courier shipping just above threshold', () => {
    // S=1500, F=0, C=0
    expect(detectShippingFee(1500, 0, 0, '宅配')).toBe(0)
  })

  it('keeps charged courier shipping clearly under free threshold', () => {
    // S=1000, F=120, C=0 → paid totals sum to 1120
    expect(detectShippingFee(1120, 0, 0, '宅配')).toBe(120)
  })

  it('keeps free cvs shipping when coupon was applied after checkout', () => {
    // S=700, F=0, C=60 → paid totals sum to 640
    expect(detectShippingFee(640, 0, 60, '7-11')).toBe(0)
  })

  it('keeps charged cvs shipping under free threshold', () => {
    // S=500, F=60, C=50 → paid totals sum to 510
    expect(detectShippingFee(510, 0, 50, '7-11')).toBe(60)
  })
})
