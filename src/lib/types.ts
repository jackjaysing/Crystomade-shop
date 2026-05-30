/** 資料庫型別定義（對應 Supabase 表格） */

export type ProductStatus = 'available' | 'sold'
export type OrderStatus = 'pending' | 'shipped'

/** 商品品類 */
export type ProductCategory = '手串' | '擺件' | '礦石'

/** 商品 */
export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  tags: string[]
  image_url: string
  /** 詳情頁額外圖片（不含封面） */
  gallery_urls: string[]
  status: ProductStatus
  description: string
  created_at: string
}

/** 訂單（含關聯商品名稱，供後台顯示） */
export interface Order {
  id: string
  created_at: string
  buyer_name: string
  phone: string
  address: string
  product_id: string
  total_amount: number
  status: OrderStatus
  /** 關聯查詢時帶入 */
  products?: Pick<Product, 'name' | 'image_url'> | null
}

/** 建立訂單表單 */
export interface OrderFormData {
  buyer_name: string
  phone: string
  address: string
}

/** 上架商品表單 */
export interface ProductFormData {
  name: string
  category: ProductCategory
  price: number
  tags: string[]
  description: string
  /** 封面圖 */
  coverFile: File | null
  /** 詳情頁額外圖片 */
  galleryFiles: File[]
}
