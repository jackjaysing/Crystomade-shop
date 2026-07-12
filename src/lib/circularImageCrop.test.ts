import { describe, expect, it } from 'vitest'
import { circularCropCoverScale } from './circularImageCrop'

describe('circularImageCrop', () => {
  it('covers circle with the shorter image edge', () => {
    expect(circularCropCoverScale(800, 400, 320)).toBe(320 / 400)
    expect(circularCropCoverScale(400, 800, 320)).toBe(320 / 400)
  })
})
