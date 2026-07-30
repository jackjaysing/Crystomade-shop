import { formatErrorMessage } from '../formatError'
import { isSupabaseConfigured, supabase } from '../supabase'

let productCostsRpcAvailable = true

function isMissingProductCostsRpc(message: string): boolean {
  return /admin_fetch_product_costs|admin_upsert_product_cost|product_costs|42883|function/i.test(
    message
  )
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
    const id = row?.product_id != null ? String(row.product_id) : ''
    if (!id) continue
    map.set(id, Math.max(0, Number(row.cost ?? 0) || 0))
  }
  return map
}

/** 後台：依商品 ID 批次讀取成本 */
export async function fetchProductCostsByIds(
  productIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const uniqueIds = [...new Set(productIds.filter(Boolean))]
  if (!isSupabaseConfigured || !productCostsRpcAvailable || uniqueIds.length === 0) {
    return map
  }

  const { data, error } = await supabase.rpc('admin_fetch_product_costs_by_ids', {
    p_product_ids: uniqueIds,
  })
  if (error) {
    const msg = formatErrorMessage(error)
    if (isMissingProductCostsRpc(msg)) {
      productCostsRpcAvailable = false
      return map
    }
    throw new Error(msg)
  }

  for (const row of data ?? []) {
    const id = row?.product_id != null ? String(row.product_id) : ''
    if (!id) continue
    map.set(id, Math.max(0, Number(row.cost ?? 0) || 0))
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
    cost: costs.get(product.id) ?? 0,
  }))
}
