import { describe, expect, it } from 'vitest'
import { resolveSoulCardDisplayHeadlines } from './grimoireFulfillment'

describe('resolveSoulCardDisplayHeadlines', () => {
  const bespokeName = '【 專屬 】五行平衡量身訂製手串'

  it('puts bespoke product name above custom bracelet title', () => {
    const headlines = resolveSoulCardDisplayHeadlines('星河守望', bespokeName)
    expect(headlines.primary).toBe(bespokeName)
    expect(headlines.secondary).toBe('星河守望')
  })

  it('hides duplicate bespoke subtitle before naming', () => {
    const headlines = resolveSoulCardDisplayHeadlines(bespokeName, bespokeName)
    expect(headlines.primary).toBe(bespokeName)
    expect(headlines.secondary).toBeNull()
  })

  it('keeps magic title primary for standard products', () => {
    const headlines = resolveSoulCardDisplayHeadlines('紫水晶靈動', '紫水晶手串')
    expect(headlines.primary).toBe('紫水晶靈動')
    expect(headlines.secondary).toBe('紫水晶手串')
  })
})
