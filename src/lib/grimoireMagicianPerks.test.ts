import { describe, expect, it } from 'vitest'
import {
  magicianLevelCumulativePerks,
  magicianLevelPerkCells,
} from './grimoireMagicianPerks'

describe('magicianLevelPerkCells', () => {
  it('grants tier VII monthly blessing, premium gift, and 2x shipping', () => {
    expect(magicianLevelPerkCells(7)).toEqual({
      blessing: '每月 1 次',
      birthday: '精選小禮',
      shipping: '每月 2 次',
    })
  })

  it('has no shipping below tier V', () => {
    expect(magicianLevelPerkCells(4).shipping).toBeNull()
  })
})

describe('magicianLevelCumulativePerks', () => {
  it('formats cumulative perks for tier VI', () => {
    expect(magicianLevelCumulativePerks(6)).toEqual([
      '雪白能量遠端加持 · 每 2 個月 1 次',
      '生日月隨機小禮',
      '免運 · 每月 1 次',
    ])
  })
})
