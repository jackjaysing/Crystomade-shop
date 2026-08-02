import { describe, expect, it } from 'vitest'
import {
  computeMagicianLevelProgress,
  soulCardOwnerCultivationXp,
} from './grimoireMagicianLevel'
import type { CrystalSoulCard } from './types'

function makeCard(overrides: Partial<CrystalSoulCard> = {}): CrystalSoulCard {
  return {
    id: 'card-1',
    order_id: 'order-1',
    user_id: 'user-1',
    purchased_by_user_id: 'buyer-1',
    product_id: null,
    serial_number: 'SN',
    public_slug: 'slug',
    product_name: '測試水晶',
    product_image_url: null,
    selected_size: null,
    product_category: null,
    product_tags: [],
    five_elements: [],
    element_primary: '土',
    magic_title: '',
    magic_affiliation: '',
    chakra: null,
    resonance_keyword: null,
    awakening_verse: null,
    magic_status: 'dormant',
    awakened_at: null,
    grimoire_task_count: 0,
    is_public: false,
    energy_level: 60,
    contract_signed_at: null,
    contract_signer_name: null,
    last_purify_at: null,
    last_moon_charge_at: null,
    last_meditation_at: null,
    gift_claim_slug: null,
    activation_slug: null,
    gifted_from_user_id: null,
    gifted_at: null,
    magic_birth_date: null,
    purchase_amount: 0,
    released_to_member: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('computeMagicianLevelProgress (VIP spend XP)', () => {
  it('maps NT$3000 spend to VIP 2', () => {
    const progress = computeMagicianLevelProgress([], 0, 3000)
    expect(progress.level.tier).toBe(2)
    expect(progress.level.title).toBe('VIP 2')
    expect(progress.totalXp).toBe(3000)
  })

  it('uses purchase amount only; cultivation ignored', () => {
    const ownerCard = makeCard({
      contract_signed_at: '2026-01-01T00:00:00Z',
      magic_status: 'ascendant',
      energy_level: 100,
    })
    const progress = computeMagicianLevelProgress([ownerCard], 99, 7999)
    expect(progress.totalXp).toBe(7999)
    expect(progress.level.tier).toBe(2)
    expect(progress.amountToNextLevel).toBe(1)
    expect(progress.ownerCultivationXp).toBe(soulCardOwnerCultivationXp(ownerCard))
    expect(progress.meritXp).toBe(99)
  })

  it('reaches VIP 7 at NT$50000', () => {
    const progress = computeMagicianLevelProgress([], 0, 50000)
    expect(progress.level.tier).toBe(7)
    expect(progress.nextLevel).toBeNull()
    expect(progress.amountToNextLevel).toBeNull()
  })

  it('shows remaining spend to next VIP', () => {
    const progress = computeMagicianLevelProgress([], 0, 1000)
    expect(progress.level.tier).toBe(1)
    expect(progress.amountToNextLevel).toBe(2000)
    expect(progress.nextLevel?.title).toBe('VIP 2')
  })
})
