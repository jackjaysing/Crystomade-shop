import { describe, expect, it } from 'vitest'
import {
  computeMagicianLevelProgress,
  soulCardBuyerXp,
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
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('soulCardOwnerCultivationXp', () => {
  it('adds milestone XP for signed ascendant cards', () => {
    const xp = soulCardOwnerCultivationXp(
      makeCard({
        contract_signed_at: '2026-01-02T00:00:00Z',
        magic_status: 'ascendant',
        energy_level: 100,
        last_purify_at: '2026-01-03T00:00:00Z',
        last_moon_charge_at: '2026-01-03T00:00:00Z',
        last_meditation_at: '2026-01-03T00:00:00Z',
        is_public: true,
      })
    )
    expect(xp).toBe(268)
  })

  it('unsigned card has no owner cultivation XP', () => {
    expect(soulCardOwnerCultivationXp(makeCard())).toBe(0)
  })
})

describe('computeMagicianLevelProgress', () => {
  it('resolves tier II at 100 XP', () => {
    const progress = computeMagicianLevelProgress([], 100)
    expect(progress.level.tier).toBe(2)
  })

  it('splits buyer purchase XP from owner cultivation', () => {
    const ownerCard = makeCard({
      user_id: 'friend-1',
      purchased_by_user_id: 'buyer-1',
      contract_signed_at: '2026-01-01T00:00:00Z',
    })

    const buyerProgress = computeMagicianLevelProgress([], 0, 1)
    expect(buyerProgress.purchaseXp).toBe(soulCardBuyerXp())
    expect(buyerProgress.ownerCultivationXp).toBe(0)

    const ownerProgress = computeMagicianLevelProgress([ownerCard], 0, 0)
    expect(ownerProgress.purchaseXp).toBe(0)
    expect(ownerProgress.ownerCultivationXp).toBe(soulCardOwnerCultivationXp(ownerCard))
  })

  it('includes merit XP in total', () => {
    const cardXp = soulCardOwnerCultivationXp(
      makeCard({ contract_signed_at: '2026-01-01T00:00:00Z' })
    )
    const progress = computeMagicianLevelProgress(
      [makeCard({ contract_signed_at: '2026-01-01T00:00:00Z' })],
      6,
      1
    )
    expect(progress.totalXp).toBe(cardXp + soulCardBuyerXp() + 6)
  })

  it('1 unsigned purchase is only +15 purchase XP', () => {
    const card = makeCard({
      user_id: 'buyer-1',
      purchased_by_user_id: 'buyer-1',
      contract_signed_at: null,
    })
    const progress = computeMagicianLevelProgress([card], 0, 1)
    expect(progress.totalXp).toBe(15)
    expect(progress.purchaseXp).toBe(15)
    expect(progress.ownerCultivationXp).toBe(0)
  })

  it('195 is not a valid single unsigned purchase total', () => {
    const progress = computeMagicianLevelProgress([], 0, 13)
    expect(progress.totalXp).toBe(195)
    expect(progress.purchaseXp).toBe(195)
  })
})
