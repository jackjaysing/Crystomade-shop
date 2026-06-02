/** 資料庫型別定義（對應 Supabase 表格） */

export type ProductStatus = 'available' | 'sold'
export type OrderStatus = 'pending' | 'shipped' | 'cancelled'

/** 訂單付款狀態（後台標記） */
export type OrderPaymentStatus = 'unpaid' | 'paid' | 'partial'

/** 超商品牌 */
export type CvsBrand = '7-11' | '全家'

/** 商品品類 */
export type ProductCategory = '手串' | '擺件' | '礦石'

/** 商品 */
export interface Product {
  id: string
  name: string
  category: ProductCategory
  /** 原價（NT$） */
  price: number
  /** 折扣（折），如 8 表示 8 折；null 表示無折扣 */
  discount_zhe: number | null
  tags: string[]
  image_url: string
  /** 詳情頁額外圖片（不含封面） */
  gallery_urls: string[]
  status: ProductStatus
  /** 庫存件數，下單成功扣 1 */
  stock: number
  description: string
  created_at: string
  /** 軟刪除時間；有值表示已從前台移除 */
  deleted_at?: string | null
  /** 後台標記熱門商品 */
  is_hot: boolean
  /** 排序：數字越小越前面（熱門商品仍置頂） */
  sort_order: number
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
  /** 下單當下商品名稱快照 */
  product_name?: string | null
  /** 下單當下商品封面快照 */
  product_image_url?: string | null
  total_amount: number
  status: OrderStatus
  /** 後台標記是否已付款 */
  is_paid: boolean
  /** 同一結帳批次 ID（購物車併單） */
  checkout_id?: string | null
  /** 人類可讀訂單編號（同一結帳批次共用） */
  order_number?: string | null
  /** 物流寄件單號（後台填寫） */
  tracking_number?: string | null
  /** 關聯查詢時帶入 */
  products?: Pick<Product, 'name' | 'image_url'> | null
}

/** 購物車品項（精簡快照，供 localStorage 暫存） */
export interface CartItem {
  productId: string
  name: string
  price: number
  image_url: string
  quantity: number
  /** 加入當下可用庫存上限 */
  maxStock: number
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
  /** 原價（NT$） */
  price: number
  /** 折扣（折），如 8 表示 8 折；null 表示無折扣 */
  discount_zhe: number | null
  tags: string[]
  description: string
  /** 上架庫存件數 */
  stock: number
  /** 標記為熱門商品 */
  is_hot: boolean
  /** 封面圖 */
  coverFile: File | null
  /** 詳情頁額外圖片 */
  galleryFiles: File[]
}

/** 公告橫幅 */
export interface AnnouncementBanner {
  id: string
  /** 橫幅名稱（後台識別） */
  name: string
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** 後台編輯公告橫幅 */
export interface BannerEditData {
  name: string
  link_url: string
  imageFile: File | null
}

/** 後台編輯商品相簿項目（可排序） */
export type ProductGalleryEditItem =
  | { kind: 'existing'; url: string }
  | { kind: 'new'; file: File; previewUrl: string }

/** 後台編輯商品表單 */
export interface ProductEditData {
  name: string
  category: ProductCategory
  /** 原價（NT$） */
  price: number
  /** 折扣（折），如 8 表示 8 折；null 表示無折扣 */
  discount_zhe: number | null
  tags: string[]
  description: string
  stock: number
  /** 標記為熱門商品 */
  is_hot: boolean
  /** 新封面；null 表示沿用原圖 */
  coverFile: File | null
  /** 詳情相簿（封面之後的順序） */
  galleryItems: ProductGalleryEditItem[]
}
