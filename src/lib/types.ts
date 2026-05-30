/** 資料庫型別定義（對應 Supabase 表格） */

export type ProductStatus = 'available' | 'sold'
export type OrderStatus = 'pending' | 'shipped'

/** 超商品牌 */
export type CvsBrand = '7-11' | '全家'

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
  /** 庫存件數，下單成功扣 1 */
  stock: number
  description: string
  created_at: string
}

/** 訂單（含關聯商品名稱，供後台顯示） */
export interface Order {
  id: string
  created_at: string
  buyer_name: string
  /** Line 顯示名稱（選填） */
  line_name: string | null
  phone: string
  cvs_brand: CvsBrand
  cvs_store: string
  product_id: string
  total_amount: number
  status: OrderStatus
  /** 關聯查詢時帶入 */
  products?: Pick<Product, 'name' | 'image_url'> | null
}

/** 建立訂單表單 */
export interface OrderFormData {
  buyer_name: string
  line_name: string
  phone: string
  cvs_brand: CvsBrand
  cvs_store: string
}

/** 上架商品表單 */
export interface ProductFormData {
  name: string
  category: ProductCategory
  price: number
  tags: string[]
  description: string
  /** 上架庫存件數 */
  stock: number
  /** 封面圖 */
  coverFile: File | null
  /** 詳情頁額外圖片 */
  galleryFiles: File[]
}

/** 後台編輯商品表單 */
export interface ProductEditData {
  name: string
  category: ProductCategory
  price: number
  tags: string[]
  description: string
  stock: number
  /** 新封面；null 表示沿用原圖 */
  coverFile: File | null
  /** 保留的既有相簿 URL */
  existingGalleryUrls: string[]
  /** 新追加的相簿圖片 */
  galleryFiles: File[]
}
