import { describe, expect, it } from 'vitest'
import {
  assessBraceletFit,
  braceletConfigFingerprint,
  computeBraceletBalance,
  estimateBraceletLengthMm,
  formatBeadElements,
  formatBeadSizeLabel,
  normalizeBraceletConfig,
  suggestedBeadCount,
} from './braceletConfig'

describe('braceletConfig', () => {
  it('normalizes config snapshot with multi elements and size', () => {
    const config = normalizeBraceletConfig({
      wrist_size: '15.5',
      goals: { elements: ['水', '土'], efficacy: ['舒緩', '守護'] },
      beads: [
        {
          bead_id: 'a',
          name: '月光石',
          elements: ['水', '金'],
          size: '10-12',
          efficacy_tags: ['情感', '舒緩'],
          image_url: 'https://example.com/a.jpg',
        },
      ],
    })
    expect(config?.beads).toHaveLength(1)
    expect(config?.beads[0].elements).toEqual(['金', '水'])
    expect(config?.beads[0].size).toBe('10-12')
    expect(formatBeadSizeLabel('10-12')).toBe('10–12mm')
    expect(config?.goals.elements).toEqual(['水', '土'])
    expect(braceletConfigFingerprint(config!)).toContain('15.5')
    expect(formatBeadElements(['水', '金'])).toBe('金／水')
  })

  it('defaults missing size to mid range', () => {
    const config = normalizeBraceletConfig({
      wrist_size: '15',
      goals: { elements: [], efficacy: [] },
      beads: [
        {
          bead_id: 'b',
          name: '黃水晶',
          element: '土',
          efficacy_tags: [],
          image_url: '',
        },
      ],
    })
    expect(config?.beads[0].elements).toEqual(['土'])
    expect(config?.beads[0].size).toBe('7-9')
  })

  it('counts dual-element beads toward both goals', () => {
    const summary = computeBraceletBalance({
      goals: { elements: ['水', '金'], efficacy: ['舒緩'] },
      beads: [
        {
          bead_id: '1',
          name: '綜合石',
          elements: ['水', '金'],
          size: '7-9',
          efficacy_tags: ['舒緩'],
          image_url: '',
        },
      ],
    })
    expect(summary.headline).toContain('到位')
    expect(summary.efficacyMatched).toContain('舒緩')
  })

  it('flags weak goal elements', () => {
    const summary = computeBraceletBalance({
      goals: { elements: ['水'], efficacy: ['舒緩'] },
      beads: [
        {
          bead_id: '1',
          name: '黃水晶',
          elements: ['土'],
          size: '7-9',
          efficacy_tags: ['財運'],
          image_url: '',
        },
        {
          bead_id: '2',
          name: '虎眼石',
          elements: ['土'],
          size: '4-6',
          efficacy_tags: ['事業'],
          image_url: '',
        },
      ],
    })
    expect(summary.headline).toContain('水')
    expect(summary.efficacyMissing).toContain('舒緩')
  })

  it('suggests bead count from wrist size', () => {
    const hint = suggestedBeadCount('15')
    expect(hint.min).toBeLessThanOrEqual(hint.max)
    expect(hint.label).toMatch(/顆/)
  })

  it('estimates length from bead sizes', () => {
    expect(
      estimateBraceletLengthMm([
        { size: '7-9' },
        { size: '7-9' },
        { size: '10-12' },
      ])
    ).toBe(8 + 8 + 11)
  })

  it('suggests adding beads when fit is short', () => {
    const beads = Array.from({ length: 10 }, () => ({ size: '7-9' as const }))
    const fit = assessBraceletFit('15', beads)
    expect(fit.status).toBe('short')
    expect(fit.suggestAdd).toBeGreaterThan(0)
    expect(fit.headline).toMatch(/加/)
  })

  it('suggests removing beads when fit is long', () => {
    const beads = Array.from({ length: 28 }, () => ({ size: '7-9' as const }))
    const fit = assessBraceletFit('15', beads)
    expect(fit.status).toBe('long')
    expect(fit.suggestRemove).toBeGreaterThan(0)
    expect(fit.headline).toMatch(/減/)
  })

  it('marks mixed sizes as ok near wrist circumference', () => {
    // 15cm → ~154mm target mid; 19×8mm = 152mm ≈ ok
    const beads = Array.from({ length: 19 }, () => ({ size: '7-9' as const }))
    const fit = assessBraceletFit('15', beads)
    expect(fit.status).toBe('ok')
  })
})
