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

export interface ProductShareStats {
  productId: string
  todayCount: number
  totalCount: number
}

export interface PageViewTimeSlot {
  dayOfWeek: number
  hour: number
  viewCount: number
}

interface ProductViewStatsRow {
  product_id: string
  today_count: number
  total_count: number
}

interface ProductShareStatsRow {
  product_id: string
  today_count: number
  total_count: number
}

interface PageViewTimeSlotRow {
  day_of_week: number
  hour_of_day: number
  view_count: number
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

/** 記錄一次商品分享（fire-and-forget） */
export async function incrementProductShare(productId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_product_share', {
    p_product_id: productId,
  })
  if (error) {
    console.warn('[晶刻] 商品分享次數記錄失敗:', error.message)
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

  return (data ?? []).map((row: ProductViewStatsRow) => ({
    productId: row.product_id,
    todayCount: Number(row.today_count ?? 0),
    totalCount: Number(row.total_count ?? 0),
  }))
}

/** 取得各商品當日與總分享次數（後台用） */
export async function fetchProductShareStats(): Promise<ProductShareStats[]> {
  const { data, error } = await supabase.rpc('get_product_share_stats')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row: ProductShareStatsRow) => ({
    productId: row.product_id,
    todayCount: Number(row.today_count ?? 0),
    totalCount: Number(row.total_count ?? 0),
  }))
}

/** 取得瀏覽時段統計（週幾 × 小時，台北時區） */
export async function fetchPageViewTimeSlotStats(): Promise<PageViewTimeSlot[]> {
  const { data, error } = await supabase.rpc('get_page_view_time_slot_stats')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row: PageViewTimeSlotRow) => ({
    dayOfWeek: Number(row.day_of_week ?? 0),
    hour: Number(row.hour_of_day ?? 0),
    viewCount: Number(row.view_count ?? 0),
  }))
}
