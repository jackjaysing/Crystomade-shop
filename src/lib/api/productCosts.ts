import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase } from '../supabase'
import type { Order } from '../types'

let productCostsRpcAvailable = true
let productCostsByIdsRpcAvailable = true

function isMissingProductCostsRpc(message: string): boolean {
  return /admin_fetch_product_costs|admin_upsert_product_cost|product_costs|42883|function/i.test(
    message
  )
}

function costKey(productId: string): string {
  return productId.trim().toLowerCase()
}

function setCost(map: Map<string, number>, productId: string, cost: number) {
  const id = costKey(productId)
  if (!id) return
  map.set(id, Math.max(0, Number(cost) || 0))
}

/** 後台：讀取全部商品成本（私密表，前台不會呼叫） */
export async function fetchProductCostsMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!isSupabaseConfigured || !productCostsRpcAvailable) return map

  const { data, error } = await supabase.rpc('admin_fetch_product_costs')
  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingProductCostsRpc(msg)) {
      productCostsRpcAvailable = false
      return map
    }
    throw new Error(msg)
  }

  for (const row of data ?? []) {
    if (row?.product_id == null) continue
    setCost(map, String(row.product_id), Number(row.cost ?? 0))
  }
  return map
}

/** 後台：依商品 ID 批次讀取成本 */
export async function fetchProductCostsByIds(
  productIds: string[]
): Promise<Map<string, number>> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))]
  if (!isSupabaseConfigured || uniqueIds.length === 0) {
    return new Map()
  }

  if (productCostsByIdsRpcAvailable) {
    const { data, error } = await supabase.rpc('admin_fetch_product_costs_by_ids', {
      p_product_ids: uniqueIds,
    })
    if (!error) {
      const map = new Map<string, number>()
      for (const row of data ?? []) {
        if (row?.product_id == null) continue
        setCost(map, String(row.product_id), Number(row.cost ?? 0))
      }
      return map
    }

    const msg = formatErrorMessage(error)
    if (isMissingProductCostsRpc(msg)) {
      productCostsByIdsRpcAvailable = false
    } else {
      throw new Error(msg)
    }
  }

  const all = await fetchProductCostsMap()
  if (all.size === 0) return all
  const map = new Map<string, number>()
  for (const id of uniqueIds) {
    const cost = all.get(costKey(id))
    if (cost != null) map.set(costKey(id), cost)
  }
  return map
}

/** 後台：寫入商品成本（私密表） */
export async function upsertProductCost(
  productId: string,
  cost: number
): Promise<number> {
  if (!isSupabaseConfigured || !productCostsRpcAvailable) {
    return Math.max(0, cost)
  }

  const { data, error } = await supabase.rpc('admin_upsert_product_cost', {
    p_product_id: productId,
    p_cost: Math.max(0, cost),
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingProductCostsRpc(msg)) {
      productCostsRpcAvailable = false
      return Math.max(0, cost)
    }
    throw new Error(msg)
  }

  return Math.max(0, Number(data ?? cost) || 0)
}

/** 將成本 map 合併進商品列表 */
export function mergeProductCosts<T extends { id: string; cost: number }>(
  products: T[],
  costs: Map<string, number>
): T[] {
  if (costs.size === 0) return products
  return products.map((product) => ({
    ...product,
    cost: costs.get(costKey(product.id)) ?? costs.get(product.id) ?? 0,
  }))
}

/** 以目前商品成本覆寫訂單關聯成本（已結訂單事後補成本也會算進分潤） */
export function applyProductCostsToOrders(
  orders: Order[],
  costs: Map<string, number>
): Order[] {
  if (costs.size === 0) return orders

  return orders.map((order) => {
    if (!order.product_id) return order
    const cost =
      costs.get(costKey(order.product_id)) ?? costs.get(order.product_id)
    if (cost == null) return order
    return {
      ...order,
      products: order.products
        ? { ...order.products, cost }
        : {
            name: order.product_name ?? '',
            image_url: order.product_image_url ?? '',
            cost,
          },
    }
  })
}

export function productCostsMapFromProducts(
  products: Array<{ id: string; cost: number }>
): Map<string, number> {
  const map = new Map<string, number>()
  for (const product of products) {
    setCost(map, product.id, product.cost)
  }
  return map
}
