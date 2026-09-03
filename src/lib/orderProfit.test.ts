import { describe, expect, it } from 'vitest'
import {
  applyProductCostsToOrders,
  productCostsMapFromProducts,
} from './api/productCosts'
import { allocateActualPaidToOrderRows } from './actualPaidAllocation'
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

describe('actual paid profit allocation', () => {
  it('allocates order actual paid to lines for studio profit', () => {
    const orders = [
      makeOrder({
        id: 'a',
        product_id: 'p1',
        product_name: 'A',
        total_amount: 2000,
        products: { name: 'A', image_url: '', cost: 500, studio_location: '羽薇' },
      }),
      makeOrder({
        id: 'b',
        product_id: 'p2',
        product_name: 'B',
        total_amount: 1000,
        products: { name: 'B', image_url: '', cost: 200, studio_location: '羽薇' },
        checkout_actual_paid_ntd: 2400,
      }),
    ]
    orders[0].checkout_actual_paid_ntd = 2400

    const withCost = applyProductCostsToOrders(
      orders,
      productCostsMapFromProducts([
        { id: 'p1', cost: 500 },
        { id: 'p2', cost: 200 },
      ])
    )
    const group = groupOrders(withCost)[0]
    const allocations = allocateActualPaidToOrderRows(group, 2400)
    expect(allocations.reduce((s, row) => s + row.amount, 0)).toBe(2400)

    const profit = computeOrderGroupProfit(group)
    expect(profit.usedActualPaid).toBe(true)
    expect(profit.revenue).toBe(2400)
    expect(profit.cost).toBe(700)
    expect(profit.netProfit).toBe(1700)
  })

  it('prefers explicit line actual paid over order total', () => {
    const orders = [
      makeOrder({
        id: 'a',
        product_id: 'p1',
        total_amount: 2000,
        checkout_actual_paid_ntd: 2400,
        line_actual_paid_ntd: 1500,
        products: { name: 'A', image_url: '', cost: 400, studio_location: '羽薇' },
      }),
      makeOrder({
        id: 'b',
        product_id: 'p2',
        product_name: 'B',
        total_amount: 1000,
        checkout_actual_paid_ntd: 2400,
        line_actual_paid_ntd: 900,
        products: { name: 'B', image_url: '', cost: 100, studio_location: '羽薇' },
      }),
    ]
    const group = groupOrders(orders)[0]
    const profit = computeOrderGroupProfit(group)
    expect(profit.revenue).toBe(2400)
    expect(profit.lines[0].revenue).toBe(1500)
    expect(profit.lines[1].revenue).toBe(900)
  })
})
