import { describe, expect, it } from 'vitest'
import {
  detectShippingFee,
  pickDiscountAbsorberKey,
  reconstructPaidLineSubtotals,
} from './orderGroupPricing'

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

  it('treats studio pickup as free shipping', () => {
    expect(detectShippingFee(300, 0, 0, '自取')).toBe(0)
    expect(detectShippingFee(300, 10, 100, '自取')).toBe(0)
  })
})

describe('reconstructPaidLineSubtotals', () => {
  it('recovers catalog prices when coupon hit a non-first line (CM261111003)', () => {
    // 標價 1080 + 13800 + 1111；點數 10；9 折券 1600 扣在紫晶洞（非排序第一）
    const lines = [
      { key: 'basin', lineTotalAfterDiscount: 1079.32 },
      { key: 'geode', lineTotalAfterDiscount: 12191.37 },
      { key: 'bag', lineTotalAfterDiscount: 1110.31 },
    ]
    const hints = new Map([
      ['basin', 1080],
      ['geode', 13800],
      ['bag', 1111],
    ])

    expect(pickDiscountAbsorberKey(lines, 10, 1600, 0, hints)).toBe('geode')

    const subtotals = reconstructPaidLineSubtotals(lines, 10, 1600, 0, hints)
    expect(subtotals.get('basin')).toBe(1080)
    expect(subtotals.get('geode')).toBe(13800)
    expect(subtotals.get('bag')).toBe(1111)
  })

  it('still works when coupon hit the first line', () => {
    const lines = [
      { key: 'a', lineTotalAfterDiscount: 400 },
      { key: 'b', lineTotalAfterDiscount: 500 },
    ]
    const hints = new Map([
      ['a', 500],
      ['b', 500],
    ])
    expect(pickDiscountAbsorberKey(lines, 0, 100, 0, hints)).toBe('a')
    const subtotals = reconstructPaidLineSubtotals(lines, 0, 100, 0, hints)
    expect(subtotals.get('a')).toBe(500)
    expect(subtotals.get('b')).toBe(500)
  })
})
