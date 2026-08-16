import { describe, expect, it } from 'vitest'
import {
  applyProductCostsToOrders,
  productCostsMapFromProducts,
} from './api/productCosts'
import { groupOrders } from './groupOrders'
import { computeOrderGroupProfit } from './orderProfit'
import type { Order } from './types'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    created_at: '2026-08-01T00:00:00Z',
    buyer_name: '測試',
    line_name: null,
    phone: '0912345678',
    cvs_brand: '7-11',
    cvs_store: '測試門市',
    product_id: 'prod-1',
    product_name: '白水晶',
    total_amount: 3000,
    status: 'shipped',
    is_paid: true,
    checkout_id: 'chk-1',
    order_number: 'C001',
    products: {
      name: '白水晶',
      image_url: '',
      cost: 0,
      studio_location: '羽薇',
    },
    ...overrides,
  }
}

describe('applyProductCostsToOrders', () => {
  it('lets later product cost edits apply to already-paid orders', () => {
    const settled = [makeOrder()]
    const withCost = applyProductCostsToOrders(
      settled,
      productCostsMapFromProducts([{ id: 'prod-1', cost: 800 }])
    )
    const profit = computeOrderGroupProfit(groupOrders(withCost)[0])

    expect(profit.cost).toBe(800)
    expect(profit.netProfit).toBe(2200)
    expect(profit.hasCost).toBe(true)
  })
})
