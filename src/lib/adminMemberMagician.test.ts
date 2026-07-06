import { describe, expect, it } from 'vitest'
import {
  buildPurchaseMeritCountByUser,
  formatMemberMagicianBookSummary,
  resolvePurchaseMeritByUser,
  summarizeMemberMagician,
} from './adminMemberMagician'
import type { AdminRegisteredCustomer, CrystalSoulCard } from './types'

function makeCard(overrides: Partial<CrystalSoulCard> = {}): CrystalSoulCard {
  return {
    id: 'card-1',
    order_id: 'order-1',
    user_id: 'owner-1',
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

const member: AdminRegisteredCustomer = {
  id: 'buyer-1',
  real_name: '測試',
  phone: '0912345678',
  birthday: '1990-01-01',
  points: 0,
  referral_code: null,
  referred_by: null,
  grimoire_merit_xp: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  order_count: 0,
  last_order_at: null,
  total_spent: 0,
}

describe('buildPurchaseMeritCountByUser', () => {
  it('counts cards by purchased_by_user_id', () => {
    const counts = buildPurchaseMeritCountByUser([
      makeCard({ id: 'a', purchased_by_user_id: 'buyer-1' }),
      makeCard({ id: 'b', purchased_by_user_id: 'buyer-1', user_id: 'friend-1' }),
      makeCard({ id: 'c', purchased_by_user_id: 'buyer-2' }),
    ])
    expect(counts.get('buyer-1')).toBe(2)
    expect(counts.get('buyer-2')).toBe(1)
  })
})

describe('summarizeMemberMagician', () => {
  it('shows pending contract instead of owned when unsigned', () => {
    const cards = [
      makeCard({
        user_id: 'buyer-1',
        purchased_by_user_id: 'buyer-1',
        contract_signed_at: null,
      }),
    ]
    const summary = summarizeMemberMagician(
      member,
      new Map([['buyer-1', cards]]),
      cards,
      new Map([['buyer-1', 1]])
    )
    expect(summary.signedBookCount).toBe(0)
    expect(summary.pendingContractCount).toBe(1)
    expect(formatMemberMagicianBookSummary(summary)).toBe('購入 1 本 · 待簽約 1 本')
  })

  it('shows signed count only after contract', () => {
    const cards = [
      makeCard({
        user_id: 'buyer-1',
        purchased_by_user_id: 'buyer-1',
        contract_signed_at: '2026-01-02T00:00:00Z',
      }),
    ]
    const summary = summarizeMemberMagician(
      member,
      new Map([['buyer-1', cards]]),
      cards,
      new Map([['buyer-1', 1]])
    )
    expect(formatMemberMagicianBookSummary(summary)).toBe('購入 1 本 · 已簽約 1 本')
  })

  it('uses purchase merit map when soul card snapshot lacks purchaser field', () => {
    const cards = [
      makeCard({
        purchased_by_user_id: null,
        user_id: 'buyer-1',
      }),
    ]
    const cardsByUser = new Map([['buyer-1', cards]])
    const meritMap = new Map([['buyer-1', 1]])

    const summary = summarizeMemberMagician(member, cardsByUser, cards, meritMap)
    expect(summary.totalXp).toBe(15)
    expect(summary.purchaseXp).toBe(15)
    expect(summary.purchaseMeritCardCount).toBe(1)
  })
})

describe('resolvePurchaseMeritByUser', () => {
  it('prefers RPC map when available', () => {
    const resolved = resolvePurchaseMeritByUser(
      new Map([['buyer-1', 2]]),
      [makeCard({ purchased_by_user_id: 'buyer-1' })]
    )
    expect(resolved.get('buyer-1')).toBe(2)
  })
})
