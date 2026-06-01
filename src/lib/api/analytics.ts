import { supabase } from '../supabase'

export interface PageViewStats {
  todayCount: number
  totalCount: number
}

export interface ProductViewStats {
  productId: string
  todayCount: number
  totalCount: number
}

/** 記錄一次頁面瀏覽（fire-and-forget） */
export async function incrementPageView(): Promise<void> {
  const { error } = await supabase.rpc('increment_page_view')
  if (error) {
    console.warn('[晶刻] 瀏覽次數記錄失敗:', error.message)
  }
}

/** 記錄一次商品瀏覽（fire-and-forget） */
export async function incrementProductView(productId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_product_view', {
    p_product_id: productId,
  })
  if (error) {
    console.warn('[晶刻] 商品瀏覽次數記錄失敗:', error.message)
  }
}

/** 取得當日與總瀏覽次數（後台用） */
export async function fetchPageViewStats(): Promise<PageViewStats> {
  const { data, error } = await supabase.rpc('get_page_view_stats').single()

  if (error) {
    throw new Error(error.message)
  }

  const row = data as { today_count: number; total_count: number }

  return {
    todayCount: Number(row.today_count ?? 0),
    totalCount: Number(row.total_count ?? 0),
  }
}

/** 取得各商品當日與總瀏覽次數（後台用） */
export async function fetchProductViewStats(): Promise<ProductViewStats[]> {
  const { data, error } = await supabase.rpc('get_product_view_stats')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => {
    const item = row as {
      product_id: string
      today_count: number
      total_count: number
    }
    return {
      productId: item.product_id,
      todayCount: Number(item.today_count ?? 0),
      totalCount: Number(item.total_count ?? 0),
    }
  })
}
